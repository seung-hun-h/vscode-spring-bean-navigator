import { 
    ClassInfo, 
    MethodInfo, 
    InjectionInfo, 
    InjectionType,
    SpringAnnotationType
} from '../models/spring-types';
import { IInjectionDetector } from './injection-detector';
import { ErrorHandler, JavaParsingError } from '../parsers/core/parser-errors';

/**
 * Setter 주입 패턴을 탐지하는 클래스입니다.
 * Spring의 @Autowired setter 메서드를 지원합니다.
 */
export class SetterInjectionDetector implements IInjectionDetector {

    /**
     * 클래스에서 Setter 주입을 탐지합니다.
     * @Autowired가 붙은 setter 메서드의 매개변수를 주입으로 간주합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 탐지된 setter 주입 정보 배열
     */
    public detectSetterInjection(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            // null 체크
            if (!classInfo || !classInfo.methods) {
                return injections;
            }

            // @Autowired가 붙은 setter 메서드들 처리
            for (const method of classInfo.methods) {
                // setter 메서드이고 @Autowired 어노테이션이 있는지 확인
                if (method.isSetterMethod && this.hasAutowiredAnnotation(method)) {
                    // 매개변수가 있는 경우에만 주입으로 간주
                    if (method.parameters && method.parameters.length > 0) {
                        for (const parameter of method.parameters) {
                            const injection: InjectionInfo = {
                                targetType: parameter.type,
                                targetName: parameter.name,
                                injectionType: InjectionType.SETTER,
                                position: parameter.position || method.position,
                                range: method.range
                            };
                            injections.push(injection);
                        }
                    }
                }
            }

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Setter 주입 탐지');
            ErrorHandler.logError(parsingError, { 
                className: classInfo?.name || 'Unknown',
                methodCount: classInfo?.methods?.length || 0
            });
        }

        return injections;
    }

    /**
     * 모든 클래스에서 Setter 주입을 탐지합니다.
     * 
     * @param classes - 분석할 클래스 정보 배열
     * @returns 탐지된 모든 setter 주입 정보 배열
     */
    public detectAllInjections(classes: ClassInfo[]): InjectionInfo[] {
        const allInjections: InjectionInfo[] = [];

        try {
            if (!classes || classes.length === 0) {
                return allInjections;
            }

            for (const classInfo of classes) {
                const setterInjections = this.detectSetterInjection(classInfo);
                allInjections.push(...setterInjections);
            }

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Setter 주입 전체 탐지');
            ErrorHandler.logError(parsingError, { 
                totalClasses: classes?.length || 0,
                processedInjections: allInjections.length
            });
        }

        return allInjections;
    }

    /**
     * 메서드에 @Autowired 어노테이션이 있는지 확인합니다.
     * 
     * @param method - 확인할 메서드 정보
     * @returns @Autowired 어노테이션이 있으면 true
     */
    private hasAutowiredAnnotation(method: MethodInfo): boolean {
        try {
            if (!method.annotations || method.annotations.length === 0) {
                return false;
            }

            return method.annotations.some(annotation => 
                annotation.type === SpringAnnotationType.AUTOWIRED ||
                annotation.name === 'Autowired'
            );

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, '@Autowired 어노테이션 확인');
            ErrorHandler.logError(parsingError, { 
                methodName: method?.name || 'Unknown',
                annotationCount: method?.annotations?.length || 0
            });
            return false;
        }
    }
} 