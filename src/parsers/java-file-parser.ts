import * as vscode from 'vscode';
import { 
    ClassInfo, 
    FieldInfo, 
    AnnotationInfo, 
    SpringAnnotationType, 
    JavaFileParseResult,
    InjectionInfo,
    InjectionType
} from '../models/spring-types';
import { JAVA_PARSER_CONFIG } from './config/java-parser-config';
import { ErrorHandler, CSTParsingError, AnnotationParsingError } from './core/parser-errors';

/**
 * Java 파일을 파싱하여 Spring 관련 정보를 추출하는 클래스
 */
export class JavaFileParser {

         /**
      * Java 파일을 파싱하여 클래스 정보를 추출합니다.
      * 
      * @param fileUri - 파싱할 Java 파일 URI
      * @param content - 파일 내용
      * @returns 파싱 결과
      */
     public async parseJavaFile(fileUri: vscode.Uri, content: string): Promise<JavaFileParseResult> {
         const result: JavaFileParseResult = {
             classes: [],
             beanDefinitions: [],
             injections: [],
             errors: []
         };

         try {
             // Dynamic import for java-parser
             const { parse } = await import('java-parser');
             
             const cst = parse(content);
             const classes = this.extractClasses(cst, fileUri, content);
             
             result.classes = classes;
             
             // @Autowired 필드 탐지
             const injections = this.extractAutowiredFields(classes);
             result.injections = injections;
             
         } catch (error) {
             const parsingError = ErrorHandler.handleParsingError(error, 'Java 파일 파싱');
             result.errors.push(ErrorHandler.createUserFriendlyMessage(parsingError));
             ErrorHandler.logError(parsingError, { fileUri: fileUri.toString() });
         }
         
         return result;
     }

    /**
     * CST에서 클래스 정보를 추출합니다.
     */
    private extractClasses(cst: any, fileUri: vscode.Uri, content: string): ClassInfo[] {
        const classes: ClassInfo[] = [];
        const lines = content.split('\n');
        
        try {
            // 패키지 정보 추출
            const packageName = this.extractPackageName(cst);
            
            // 임포트 정보 추출
            const imports = this.extractImports(cst);
            
            // 클래스 정의 추출
            const classDeclarations = this.findClassDeclarations(cst);
            
            for (const classDecl of classDeclarations) {
                const classInfo = this.parseClassDeclaration(
                    classDecl, 
                    fileUri, 
                    content, 
                    lines, 
                    packageName, 
                    imports
                );
                
                if (classInfo) {
                    classes.push(classInfo);
                }
            }
            
        } catch (error) {
            console.error('클래스 추출 중 오류:', error);
        }
        
        return classes;
    }

    /**
     * 패키지 이름을 추출합니다.
     */
    private extractPackageName(cst: any): string | undefined {
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            if (ordinaryCompUnit?.children?.packageDeclaration) {
                const packageDecl = ordinaryCompUnit.children.packageDeclaration[0];
                if (packageDecl.children?.Identifier) {
                    // 실제 구조: packageDeclaration.children = ['Package', 'Identifier', 'Dot', 'Semicolon']
                    const identifiers = packageDecl.children.Identifier;
                    return identifiers.map((id: any) => id.image).join('.');
                }
            }
        } catch (error) {
            console.error('패키지 이름 추출 실패:', error);
        }
        return undefined;
    }

    /**
     * 임포트 문들을 추출합니다.
     */
    private extractImports(cst: any): string[] {
        const imports: string[] = [];
        
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            const importDeclarations = ordinaryCompUnit?.children?.importDeclaration;
            
            if (importDeclarations) {
                for (const importDecl of importDeclarations) {
                    const importName = this.extractImportName(importDecl);
                    if (importName) {
                        imports.push(importName);
                    }
                }
            }
        } catch (error) {
            console.error('임포트 추출 실패:', error);
        }
        
        return imports;
    }

    /**
     * 개별 임포트 이름을 추출합니다.
     */
    private extractImportName(importDecl: any): string | undefined {
        try {
            if (importDecl.children?.packageOrTypeName?.[0]?.children?.Identifier) {
                const identifiers = importDecl.children.packageOrTypeName[0].children.Identifier;
                return identifiers.map((id: any) => id.image).join('.');
            }
        } catch (error) {
            console.error('임포트 이름 추출 실패:', error);
        }
        return undefined;
    }

    /**
     * 클래스 선언들을 찾습니다.
     */
    private findClassDeclarations(cst: any): any[] {
        const classDeclarations: any[] = [];
        
        try {
            const ordinaryCompUnit = cst.children?.ordinaryCompilationUnit?.[0];
            const typeDeclarations = ordinaryCompUnit?.children?.typeDeclaration;
            
            if (typeDeclarations) {
                for (const typeDecl of typeDeclarations) {
                    if (typeDecl.children?.classDeclaration) {
                        classDeclarations.push(typeDecl.children.classDeclaration[0]);
                    }
                }
            }
        } catch (error) {
            console.error('클래스 선언 찾기 실패:', error);
        }
        
        return classDeclarations;
    }

    /**
     * 클래스 선언을 파싱하여 ClassInfo 객체를 생성합니다.
     */
    private parseClassDeclaration(
        classDecl: any, 
        fileUri: vscode.Uri, 
        content: string, 
        lines: string[], 
        packageName: string | undefined, 
        imports: string[]
    ): ClassInfo | undefined {
        try {
            // 클래스 이름 추출
            const className = classDecl.children?.normalClassDeclaration?.[0]?.children?.typeIdentifier?.[0]?.children?.Identifier?.[0]?.image;
            
            if (!className) {
                return undefined;
            }

            // 클래스 위치 정보 계산
            const position = this.calculatePosition(classDecl, lines);
            const range = this.calculateRange(classDecl, lines);

            // 클래스 어노테이션 추출
            const annotations = this.extractClassAnnotations(classDecl, lines);

            // 필드 정보 추출
            const fields = this.extractFields(classDecl, lines);

            // 인터페이스 정보 추출
            const interfaces = this.extractImplementedInterfaces(classDecl);

            const fullyQualifiedName = packageName ? `${packageName}.${className}` : className;

            const classInfo: ClassInfo = {
                name: className,
                packageName,
                fullyQualifiedName,
                fileUri,
                position,
                range,
                annotations,
                fields,
                imports
            };

            // 인터페이스 정보를 확장 속성으로 추가
            if (interfaces.length > 0) {
                (classInfo as any).interfaces = interfaces;
            }

            return classInfo;
            
        } catch (error) {
            console.error('클래스 파싱 실패:', error);
            return undefined;
        }
    }

    /**
     * 클래스의 어노테이션들을 추출합니다.
     */
    private extractClassAnnotations(classDecl: any, lines: string[]): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            // 실제 구조: classDeclaration.children = ['classModifier', 'normalClassDeclaration']
            const classModifiers = classDecl.children?.classModifier;
            
            if (classModifiers) {
                for (const modifier of classModifiers) {
                    if (modifier.children?.annotation) {
                        const annotation = this.parseAnnotation(modifier.children.annotation[0], lines);
                        if (annotation) {
                            annotations.push(annotation);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('클래스 어노테이션 추출 실패:', error);
        }
        
        return annotations;
    }

    /**
     * 클래스의 필드들을 추출합니다.
     */
    private extractFields(classDecl: any, lines: string[]): FieldInfo[] {
        const fields: FieldInfo[] = [];
        
        try {
            const classBody = classDecl.children?.normalClassDeclaration?.[0]?.children?.classBody?.[0];
            const classMemberDeclarations = classBody?.children?.classBodyDeclaration;
            
            if (classMemberDeclarations) {
                for (const memberDecl of classMemberDeclarations) {
                    if (memberDecl.children?.classMemberDeclaration?.[0]?.children?.fieldDeclaration) {
                        const fieldDecl = memberDecl.children.classMemberDeclaration[0].children.fieldDeclaration[0];
                        const fieldInfo = this.parseFieldDeclaration(fieldDecl, lines);
                        
                        if (fieldInfo) {
                            fields.push(fieldInfo);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('필드 추출 실패:', error);
        }
        
        return fields;
    }

    /**
     * 필드 선언을 파싱하여 FieldInfo 객체를 생성합니다.
     */
    private parseFieldDeclaration(fieldDecl: any, lines: string[]): FieldInfo | undefined {
        try {
            // 필드 타입 추출
            const fieldType = this.extractFieldType(fieldDecl);
            
            // 필드 이름 추출
            const fieldName = this.extractFieldName(fieldDecl);
            
            if (!fieldType || !fieldName) {
                return undefined;
            }

            // 위치 정보 계산
            const position = this.calculatePosition(fieldDecl, lines);
            const range = this.calculateRange(fieldDecl, lines);

            // 필드 어노테이션 추출
            const annotations = this.extractFieldAnnotations(fieldDecl, lines);

            // 접근 제한자 및 키워드 추출
            const modifiers = this.extractFieldModifiers(fieldDecl);

            const fieldInfo: FieldInfo = {
                name: fieldName,
                type: fieldType,
                position,
                range,
                annotations,
                visibility: modifiers.visibility,
                isFinal: modifiers.isFinal,
                isStatic: modifiers.isStatic
            };

            return fieldInfo;
            
        } catch (error) {
            console.error('필드 파싱 실패:', error);
            return undefined;
        }
    }

    /**
     * 필드 타입을 추출합니다.
     */
    private extractFieldType(fieldDecl: any): string | undefined {
        try {
            const unannType = fieldDecl.children?.unannType?.[0];
            // 실제 구조: unannType → unannReferenceType → unannClassOrInterfaceType → unannClassType → Identifier
            if (unannType?.children?.unannReferenceType?.[0]?.children?.unannClassOrInterfaceType?.[0]?.children?.unannClassType?.[0]?.children?.Identifier?.[0]?.image) {
                const typeName = unannType.children.unannReferenceType[0].children.unannClassOrInterfaceType[0].children.unannClassType[0].children.Identifier[0].image;
                return typeName;
            }
            
        } catch (error) {
            console.error('필드 타입 추출 실패:', error);
        }
        
        return undefined;
    }

    /**
     * 필드 이름을 추출합니다.
     */
    private extractFieldName(fieldDecl: any): string | undefined {
        try {
            const variableDeclarators = fieldDecl.children?.variableDeclaratorList?.[0]?.children?.variableDeclarator;
            if (variableDeclarators && variableDeclarators.length > 0) {
                return variableDeclarators[0].children?.variableDeclaratorId?.[0]?.children?.Identifier?.[0]?.image;
            }
        } catch (error) {
            console.error('필드 이름 추출 실패:', error);
        }
        return undefined;
    }

    /**
     * 필드의 어노테이션들을 추출합니다.
     */
    private extractFieldAnnotations(fieldDecl: any, lines: string[]): AnnotationInfo[] {
        const annotations: AnnotationInfo[] = [];
        
        try {
            const fieldModifiers = fieldDecl.children?.fieldModifier;
            
            if (fieldModifiers) {
                for (const modifier of fieldModifiers) {
                    if (modifier.children?.annotation) {
                        const annotation = this.parseAnnotation(modifier.children.annotation[0], lines);
                        if (annotation) {
                            annotations.push(annotation);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('필드 어노테이션 추출 실패:', error);
        }
        
        return annotations;
    }

    /**
     * 필드의 접근 제한자 및 키워드를 추출합니다.
     */
    private extractFieldModifiers(fieldDecl: any): { visibility?: string; isFinal: boolean; isStatic: boolean } {
        const result = { visibility: undefined as string | undefined, isFinal: false, isStatic: false };
        
        try {
            const fieldModifiers = fieldDecl.children?.fieldModifier;
            
            if (fieldModifiers) {
                for (const modifier of fieldModifiers) {
                    if (modifier.children?.Public) {
                        result.visibility = 'public';
                    } else if (modifier.children?.Private) {
                        result.visibility = 'private';
                    } else if (modifier.children?.Protected) {
                        result.visibility = 'protected';
                    } else if (modifier.children?.Final) {
                        result.isFinal = true;
                    } else if (modifier.children?.Static) {
                        result.isStatic = true;
                    }
                }
            }
            
        } catch (error) {
            console.error('필드 제한자 추출 실패:', error);
        }
        
        return result;
    }

    /**
     * 어노테이션을 파싱합니다.
     */
    private parseAnnotation(annotation: any, lines: string[]): AnnotationInfo | undefined {
        let annotationName: string | undefined;
        
        try {
            let parameters = new Map<string, string>();
            
            // 실제 구조: annotation.children = ['At', 'typeName'] 또는 ['At', 'typeName', 'LParen', 'elementValuePairList', 'RParen']
            if (annotation.children?.typeName?.[0]?.children?.Identifier?.[0]?.image) {
                annotationName = annotation.children.typeName[0].children.Identifier[0].image;
            } else {
                return undefined;
            }
            
            if (!annotationName) {
                return undefined;
            }

            // Spring 어노테이션인지 확인
            if (!JAVA_PARSER_CONFIG.SPRING_ANNOTATIONS.has(annotationName)) {
                return undefined;
            }

            // 어노테이션 매개변수 파싱 시도
            parameters = this.extractAnnotationParameters(annotation);

            const springAnnotationType = this.mapToSpringAnnotationType(annotationName);
            if (!springAnnotationType) {
                return undefined;
            }

            // 위치 정보 계산 (실제로는 더 정확한 계산이 필요)
            const position = this.calculatePosition(annotation, lines);

            const annotationInfo: AnnotationInfo = {
                name: annotationName,
                type: springAnnotationType,
                line: position.line,
                column: position.character,
                parameters
            };

            return annotationInfo;
            
        } catch (error) {
            const annotationError = new AnnotationParsingError(
                '어노테이션 파싱 실패',
                annotationName,
                error instanceof Error ? error : undefined
            );
            ErrorHandler.logError(annotationError);
            return undefined;
        }
    }

    /**
     * 어노테이션 매개변수를 추출합니다.
     */
    private extractAnnotationParameters(annotation: any): Map<string, string> {
        const parameters = new Map<string, string>();
        
        try {
            // @Service("value") 형태의 단일 값
            if (annotation.children?.LParen && annotation.children?.StringLiteral) {
                const value = annotation.children.StringLiteral[0].image;
                // 따옴표 제거
                const cleanValue = value.replace(/["']/g, '');
                parameters.set('value', cleanValue);
                return parameters;
            }
            
            // elementValuePairList 구조 확인 (향후 확장용)
            if (annotation.children?.elementValuePairList) {
                // TODO: 더 복잡한 매개변수 구조 파싱
            }
            
            // 모든 자식 노드를 탐색해서 문자열 리터럴 찾기
            const findStringLiterals = (node: any): string[] => {
                const literals: string[] = [];
                
                if (node?.image && typeof node.image === 'string' && (node.image.startsWith('"') || node.image.startsWith("'"))) {
                    literals.push(node.image.replace(/["']/g, ''));
                }
                
                if (node?.children) {
                    for (const key of Object.keys(node.children)) {
                        if (Array.isArray(node.children[key])) {
                            for (const child of node.children[key]) {
                                literals.push(...findStringLiterals(child));
                            }
                        }
                    }
                }
                
                return literals;
            };
            
            const literals = findStringLiterals(annotation);
            if (literals.length > 0) {
                parameters.set('value', literals[0]);
            }
            
        } catch (error) {
            console.error('어노테이션 매개변수 추출 실패:', error);
        }
        
        return parameters;
    }

    /**
     * 문자열을 SpringAnnotationType으로 매핑합니다.
     */
    private mapToSpringAnnotationType(annotationName: string): SpringAnnotationType | undefined {
        switch (annotationName) {
            case 'Component': return SpringAnnotationType.COMPONENT;
            case 'Service': return SpringAnnotationType.SERVICE;
            case 'Repository': return SpringAnnotationType.REPOSITORY;
            case 'Controller': return SpringAnnotationType.CONTROLLER;
            case 'RestController': return SpringAnnotationType.REST_CONTROLLER;
            case 'Configuration': return SpringAnnotationType.CONFIGURATION;
            case 'Bean': return SpringAnnotationType.BEAN;
            case 'Autowired': return SpringAnnotationType.AUTOWIRED;
            default: return undefined;
        }
    }

    /**
     * AST 노드의 위치 정보를 계산합니다.
     */
    private calculatePosition(node: any, lines: string[]): vscode.Position {
        // CST에서 실제 위치 정보 추출 시도
        try {
            if (node?.location?.startLine !== undefined && node?.location?.startColumn !== undefined) {
                // 1-based를 0-based로 변환
                return new vscode.Position(node.location.startLine - 1, node.location.startColumn - 1);
            }
            
            // image가 있는 경우 파일 내용에서 해당 텍스트 찾기
            if (node?.image && typeof node.image === 'string') {
                for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                    const columnIndex = lines[lineIndex].indexOf(node.image);
                    if (columnIndex >= 0) {
                        return new vscode.Position(lineIndex, columnIndex);
                    }
                }
            }
        } catch (error) {
            console.warn('위치 계산 실패:', error);
        }
        
        // fallback: 설정값 반환
        return new vscode.Position(JAVA_PARSER_CONFIG.POSITION_FALLBACK.line, JAVA_PARSER_CONFIG.POSITION_FALLBACK.character);
    }

         /**
      * AST 노드의 범위 정보를 계산합니다.
      */
     private calculateRange(node: any, lines: string[]): vscode.Range {
         // 실제 구현에서는 CST의 위치 정보를 사용해야 함
         // 여기서는 임시로 첫 번째 라인을 반환
         const start = new vscode.Position(JAVA_PARSER_CONFIG.POSITION_FALLBACK.line, JAVA_PARSER_CONFIG.POSITION_FALLBACK.character);
         const end = new vscode.Position(JAVA_PARSER_CONFIG.POSITION_FALLBACK.line, lines[0]?.length || JAVA_PARSER_CONFIG.POSITION_FALLBACK.character);
         return new vscode.Range(start, end);
     }

     /**
      * 클래스들에서 @Autowired 어노테이션이 붙은 필드들을 추출하여 주입 정보를 생성합니다.
      * 
      * @param classes - 파싱된 클래스 정보들
      * @returns @Autowired 필드들의 주입 정보
      */
     private extractAutowiredFields(classes: ClassInfo[]): InjectionInfo[] {
         const injections: InjectionInfo[] = [];

         for (const classInfo of classes) {
             for (const field of classInfo.fields) {
                 // @Autowired 어노테이션이 있는 필드인지 확인
                 const autowiredAnnotation = field.annotations.find(
                     annotation => annotation.type === SpringAnnotationType.AUTOWIRED
                 );

                 if (autowiredAnnotation) {
                     // 실제 위치 찾기 (fallback)
                     const actualPosition = this.findFieldPositionInContent(classInfo, field.name, field.type);
                     
                     const injection: InjectionInfo = {
                         targetType: field.type,
                         injectionType: InjectionType.FIELD,
                         position: actualPosition || field.position,
                         range: new vscode.Range(
                             actualPosition || field.position, 
                             new vscode.Position(
                                 (actualPosition || field.position).line, 
                                 (actualPosition || field.position).character + field.name.length
                             )
                         ),
                         targetName: field.name,
                         // resolvedBean과 candidateBeans는 나중에 BeanResolver에서 설정
                         resolvedBean: undefined,
                         candidateBeans: undefined
                     };

                     injections.push(injection);
                 }
             }
         }

         return injections;
     }

     /**
      * 파일 내용에서 실제 필드 위치를 찾습니다.
      */
     private findFieldPositionInContent(classInfo: ClassInfo, fieldName: string, fieldType: string): vscode.Position | undefined {
         try {
             // 파일 내용 가져오기
             const document = vscode.workspace.textDocuments.find(doc => doc.uri.toString() === classInfo.fileUri.toString());
             if (!document) {
                 return undefined;
             }
             
             const content = document.getText();
             const lines = content.split('\n');
             
             // @Autowired와 필드 선언 패턴 찾기
             for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
                 const line = lines[lineIndex];
                 
                 // @Autowired 어노테이션 찾기
                 if (line.includes('@Autowired')) {
                                         // 다음 몇 줄에서 해당 필드 찾기
                    for (let nextLineIndex = lineIndex + 1; nextLineIndex < Math.min(lineIndex + JAVA_PARSER_CONFIG.MAX_FIELD_SEARCH_LINES, lines.length); nextLineIndex++) {
                         const nextLine = lines[nextLineIndex];
                         
                         // 필드 선언 패턴: "타입 필드명" 또는 "private 타입 필드명"
                         const fieldPattern = new RegExp(`\\b${fieldType}\\s+${fieldName}\\b`);
                         if (fieldPattern.test(nextLine)) {
                             const columnIndex = nextLine.indexOf(fieldName);
                             if (columnIndex >= 0) {
                                 return new vscode.Position(nextLineIndex, columnIndex);
                             }
                         }
                     }
                 }
             }
             
         } catch (error) {
             console.warn('필드 위치 찾기 실패:', error);
         }
         
         return undefined;
     }

     /**
      * @Autowired 어노테이션이 붙은 필드가 있는지 확인합니다.
      * 
      * @param classInfo - 확인할 클래스 정보
      * @returns @Autowired 필드가 있으면 true
      */
     public hasAutowiredFields(classInfo: ClassInfo): boolean {
         return classInfo.fields.some(field => 
             field.annotations.some(annotation => 
                 annotation.type === SpringAnnotationType.AUTOWIRED
             )
         );
     }

     /**
      * 특정 타입에 대한 @Autowired 필드들을 찾습니다.
      * 
      * @param classInfo - 검색할 클래스 정보
      * @param targetType - 찾을 타입
      * @returns 해당 타입의 @Autowired 필드들
      */
     public findAutowiredFieldsByType(classInfo: ClassInfo, targetType: string): FieldInfo[] {
         return classInfo.fields.filter(field => {
             const hasAutowired = field.annotations.some(annotation => 
                 annotation.type === SpringAnnotationType.AUTOWIRED
             );
             const isTargetType = field.type === targetType;
             
             return hasAutowired && isTargetType;
         });
     }

     /**
      * Java 파일 내용에서 직접 @Autowired 패턴을 찾는 간단한 방법
      * (CST 파싱이 실패할 경우의 fallback)
      * 
      * @param content - Java 파일 내용
      * @param fileUri - 파일 URI
      * @returns 발견된 @Autowired 위치들
      */
     public findAutowiredPatterns(content: string, fileUri: vscode.Uri): InjectionInfo[] {
         const injections: InjectionInfo[] = [];
         const lines = content.split('\n');
         
         for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
             const line = lines[lineIndex];
             
             // @Autowired 어노테이션 찾기
             if (line.trim().includes('@Autowired')) {
                 // 다음 라인에서 필드 선언 찾기
                 const nextLineIndex = lineIndex + 1;
                 if (nextLineIndex < lines.length) {
                     const nextLine = lines[nextLineIndex];
                     const fieldMatch = nextLine.match(/^\s*(private|protected|public)?\s+(\w+)\s+(\w+)\s*;/);
                     
                     if (fieldMatch) {
                         const [, visibility, type, name] = fieldMatch;
                         
                         const position = new vscode.Position(nextLineIndex, nextLine.indexOf(name));
                         const range = new vscode.Range(
                             position,
                             new vscode.Position(nextLineIndex, nextLine.indexOf(name) + name.length)
                         );
                         
                         const injection: InjectionInfo = {
                             targetType: type,
                             injectionType: InjectionType.FIELD,
                             position,
                             range,
                             targetName: name
                         };
                         
                         injections.push(injection);
                     }
                 }
             }
         }
         
         return injections;
     }

    /**
     * 클래스가 구현하는 인터페이스들을 추출합니다.
     * 
     * @param classDecl 클래스 선언 CST 노드
     * @returns 구현하는 인터페이스 이름들
     */
    private extractImplementedInterfaces(classDecl: any): string[] {
        const interfaces: string[] = [];
        
        try {
            const normalClassDecl = classDecl.children?.normalClassDeclaration?.[0];
            
            if (normalClassDecl?.children) {
                // superinterfaces 직접 확인
                const superinterfaces = normalClassDecl.children.superinterfaces;
                
                if (superinterfaces && superinterfaces.length > 0) {
                    // interfaceTypeList 확인
                    const interfaceTypeList = superinterfaces[0].children?.interfaceTypeList;
                    if (interfaceTypeList && interfaceTypeList.length > 0) {
                        // interfaceType들 확인
                        const interfaceTypes = interfaceTypeList[0].children?.interfaceType;
                        if (interfaceTypes && Array.isArray(interfaceTypes)) {
                            for (const interfaceType of interfaceTypes) {
                                const interfaceName = this.extractInterfaceName(interfaceType);
                                if (interfaceName) {
                                    interfaces.push(interfaceName);
                                }
                            }
                        }
                    }
                } else {
                    // 대안: 재귀적으로 Implements 키워드와 Identifier 찾기
                    const foundInterfaces = this.findInterfacesRecursively(normalClassDecl);
                    interfaces.push(...foundInterfaces);
                }
            }
            
        } catch (error) {
            console.error('인터페이스 추출 실패:', error);
        }
        
        return interfaces;
    }

    /**
     * 재귀적으로 CST를 탐색해서 implements 절의 인터페이스들을 찾습니다.
     */
    private findInterfacesRecursively(node: any): string[] {
        const interfaces: string[] = [];
        
        if (!node) {
            return interfaces;
        }
        
        try {
            // Implements 키워드를 찾았다면 그 다음에 오는 Identifier들을 수집
            if (node.children?.Implements) {
                const identifiers = this.collectIdentifiersAfterImplements(node);
                interfaces.push(...identifiers);
            }
            
            // 자식 노드들을 재귀적으로 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            const childInterfaces = this.findInterfacesRecursively(child);
                            interfaces.push(...childInterfaces);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('재귀 탐색 실패:', error);
        }
        
        return interfaces;
    }

    /**
     * Implements 키워드 이후의 Identifier들을 수집합니다.
     */
    private collectIdentifiersAfterImplements(node: any): string[] {
        const identifiers: string[] = [];
        
        try {
            // 현재 노드와 자식 노드에서 Identifier 찾기
            this.collectAllIdentifiers(node, identifiers);
            
            // Implements 키워드와 Java 구문 기호들은 제외하고 실제 인터페이스 이름만 필터링
            const filteredIdentifiers = identifiers.filter(id => 
                id && 
                id.trim() !== '' && 
                !JAVA_PARSER_CONFIG.JAVA_KEYWORDS_AND_SYMBOLS.has(id) &&
                // 첫 글자가 대문자인 것만 (Java 인터페이스 명명 규칙)
                JAVA_PARSER_CONFIG.INTERFACE_NAME_REGEX.test(id)
            );
            
            // 중복 제거
            const uniqueInterfaces = [...new Set(filteredIdentifiers)];
            
            return uniqueInterfaces;
            
        } catch (error) {
            console.error('Identifier 수집 실패:', error);
        }
        
        return identifiers;
    }

    /**
     * 노드에서 모든 Identifier를 재귀적으로 수집합니다.
     */
    private collectAllIdentifiers(node: any, identifiers: string[]): void {
        if (!node) {
            return;
        }
        
        try {
            // Identifier 노드인 경우
            if (node.image && typeof node.image === 'string') {
                identifiers.push(node.image);
            }
            
            // 자식 노드 탐색
            if (node.children) {
                for (const key of Object.keys(node.children)) {
                    if (Array.isArray(node.children[key])) {
                        for (const child of node.children[key]) {
                            this.collectAllIdentifiers(child, identifiers);
                        }
                    }
                }
            }
            
        } catch (error) {
            console.error('Identifier 수집 중 오류:', error);
        }
    }

    /**
     * 개별 인터페이스 타입에서 인터페이스 이름을 추출합니다.
     * 
     * @param interfaceType 인터페이스 타입 CST 노드
     * @returns 인터페이스 이름
     */
    private extractInterfaceName(interfaceType: any): string | undefined {
        try {
            // interfaceType 구조: classType
            const classType = interfaceType.children?.classType?.[0];
            
            if (classType) {
                // classType에서 Identifier 추출
                const identifiers = classType.children?.Identifier;
                
                if (identifiers && Array.isArray(identifiers)) {
                    // 패키지명이 포함된 경우 마지막 부분만 가져오기
                    const interfaceName = identifiers[identifiers.length - 1].image;
                    return interfaceName;
                }
                
                // 단일 Identifier인 경우
                if (classType.children?.Identifier?.image) {
                    return classType.children.Identifier.image;
                }
            }
            
            // 다른 구조일 경우 대안 시도
            if (interfaceType.children?.Identifier) {
                const identifiers = interfaceType.children.Identifier;
                if (Array.isArray(identifiers)) {
                    return identifiers[identifiers.length - 1].image;
                }
                return identifiers.image;
            }
            
        } catch (error) {
            console.error('인터페이스 이름 추출 실패:', error);
        }
        
        return undefined;
    }
} 