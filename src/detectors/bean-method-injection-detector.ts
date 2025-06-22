import { InjectionInfo, InjectionType, ClassInfo, SpringAnnotationType } from '../models/spring-types';
import { AbstractInjectionDetector } from './abstract-injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * @Bean 메서드 매개변수 주입을 감지하는 클래스
 * @Configuration 클래스 내의 @Bean 메서드 매개변수들을 Spring 주입 포인트로 감지합니다.
 */
export class BeanMethodInjectionDetector extends AbstractInjectionDetector {

    /**
     * Detector 이름을 반환합니다.
     * 
     * @returns Detector 이름
     */
    protected getDetectorName(): string {
        return 'BeanMethodInjectionDetector';
    }

    /**
     * 단일 클래스에서 Bean 메서드 매개변수 주입을 감지합니다.
     * AbstractInjectionDetector의 Template Method Pattern에서 호출됩니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 감지된 Bean 메서드 매개변수 주입 정보 배열
     */
    protected detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[] {
        return this.detectInjections(classInfo);
    }

    /**
     * 클래스에서 @Bean 메서드 매개변수 주입을 감지합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 감지된 Bean 메서드 매개변수 주입 정보 배열
     */
    public detectInjections(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            // @Configuration 클래스인지 확인
            if (!this.isConfigurationClass(classInfo)) {
                return injections;
            }

            // 클래스의 모든 메서드 검사
            if (!classInfo.methods || classInfo.methods.length === 0) {
                return injections;
            }

            for (const method of classInfo.methods) {
                // @Bean 어노테이션이 있는 메서드인지 확인
                if (!this.isBeanMethod(method)) {
                    continue;
                }

                // 메서드의 모든 매개변수를 주입 포인트로 감지
                if (method.parameters && method.parameters.length > 0) {
                    for (const parameter of method.parameters) {
                        const injection: InjectionInfo = {
                            targetType: parameter.type,
                            targetName: parameter.name,
                            injectionType: InjectionType.BEAN_METHOD,
                            position: parameter.position || method.position,
                            range: parameter.range || method.range
                        };

                        injections.push(injection);
                    }
                }
            }

            return injections;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Bean 메서드 매개변수 주입 감지');
            ErrorHandler.logError(parsingError, {
                detectorName: this.getDetectorName(),
                className: classInfo.name,
                methodCount: classInfo.methods?.length || 0
            });
            return injections;
        }
    }

    /**
     * 클래스가 @Configuration 클래스인지 확인합니다.
     * 
     * @param classInfo - 확인할 클래스 정보
     * @returns @Configuration 클래스 여부
     */
    private isConfigurationClass(classInfo: ClassInfo): boolean {
        if (!classInfo.annotations || classInfo.annotations.length === 0) {
            return false;
        }

        return classInfo.annotations.some(annotation => 
            annotation.type === SpringAnnotationType.CONFIGURATION
        );
    }

    /**
     * 메서드가 @Bean 메서드인지 확인합니다.
     * 
     * @param method - 확인할 메서드 정보
     * @returns @Bean 메서드 여부
     */
    private isBeanMethod(method: any): boolean {
        if (!method.annotations || method.annotations.length === 0) {
            return false;
        }

        return method.annotations.some((annotation: any) => 
            annotation.type === SpringAnnotationType.BEAN
        );
    }

    /**
     * Bean 메서드 매개변수 주입이 올바른지 검증합니다.
     * 
     * @param classInfo - 클래스 정보
     * @returns 검증 결과
     */
    public validateInjection(classInfo: ClassInfo): boolean {
        try {
            // @Configuration 클래스여야 함
            if (!this.isConfigurationClass(classInfo)) {
                return false;
            }

            // @Bean 메서드가 최소 하나는 있어야 함
            if (!classInfo.methods || classInfo.methods.length === 0) {
                return false;
            }

            const beanMethods = classInfo.methods.filter(method => this.isBeanMethod(method));
            return beanMethods.length > 0;

        } catch (error) {
            const parsingError = ErrorHandler.handleParsingError(error, 'Bean 메서드 주입 검증');
            ErrorHandler.logError(parsingError, {
                detectorName: this.getDetectorName(),
                className: classInfo.name
            });
            return false;
        }
    }

    /**
     * 디버깅을 위한 정보를 생성합니다.
     * 
     * @param classInfo - 클래스 정보
     * @returns 디버깅 정보
     */
    public getDebugInfo(classInfo: ClassInfo): any {
        const isConfiguration = this.isConfigurationClass(classInfo);
        const beanMethods = classInfo.methods?.filter(method => this.isBeanMethod(method)) || [];
        const totalParameters = beanMethods.reduce((sum, method) => sum + (method.parameters?.length || 0), 0);

        return {
            isConfigurationClass: isConfiguration,
            totalMethods: classInfo.methods?.length || 0,
            beanMethodCount: beanMethods.length,
            totalBeanMethodParameters: totalParameters,
            beanMethods: beanMethods.map(method => ({
                name: method.name,
                parameterCount: method.parameters?.length || 0,
                parameters: method.parameters?.map(p => ({ name: p.name, type: p.type })) || []
            }))
        };
    }
} 