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

/**
 * Java 파일을 파싱하여 Spring 관련 정보를 추출하는 클래스
 */
export class JavaFileParser {
    private static readonly SPRING_ANNOTATIONS = new Set([
        'Component', 'Service', 'Repository', 'Controller', 'RestController',
        'Configuration', 'Bean', 'Autowired'
    ]);

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
             const errorMessage = error instanceof Error ? error.message : 'Unknown parsing error';
             result.errors.push(`Java 파일 파싱 실패: ${errorMessage}`);
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
        try {
            let annotationName: string | undefined;
            
            // 실제 구조: annotation.children = ['At', 'typeName']
            if (annotation.children?.typeName?.[0]?.children?.Identifier?.[0]?.image) {
                annotationName = annotation.children.typeName[0].children.Identifier[0].image;
            } else {
                return undefined;
            }
            
            if (!annotationName) {
                return undefined;
            }

            // Spring 어노테이션인지 확인
            if (!JavaFileParser.SPRING_ANNOTATIONS.has(annotationName)) {
                return undefined;
            }

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
                parameters: new Map() // 매개변수는 추후 구현
            };

            return annotationInfo;
            
        } catch (error) {
            console.error('어노테이션 파싱 실패:', error);
            return undefined;
        }
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
        // 실제 구현에서는 CST의 위치 정보를 사용해야 함
        // 여기서는 임시로 0,0을 반환
        return new vscode.Position(0, 0);
    }

         /**
      * AST 노드의 범위 정보를 계산합니다.
      */
     private calculateRange(node: any, lines: string[]): vscode.Range {
         // 실제 구현에서는 CST의 위치 정보를 사용해야 함
         // 여기서는 임시로 첫 번째 라인을 반환
         const start = new vscode.Position(0, 0);
         const end = new vscode.Position(0, lines[0]?.length || 0);
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
                     const injection: InjectionInfo = {
                         targetType: field.type,
                         injectionType: InjectionType.FIELD,
                         position: field.position,
                         range: field.range,
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
} 