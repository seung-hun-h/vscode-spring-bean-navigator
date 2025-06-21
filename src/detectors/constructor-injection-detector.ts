import { 
    ClassInfo, 
    ConstructorInfo, 
    InjectionInfo, 
    InjectionType 
} from '../models/spring-types';

/**
 * 생성자 주입 패턴을 탐지하는 클래스입니다.
 * Spring Framework 5.0+의 단일 생성자 자동 주입과 @Autowired 생성자를 지원합니다.
 */
export class ConstructorInjectionDetector {

    /**
     * 단일 생성자 주입을 탐지합니다.
     * Spring 5.0+에서는 생성자가 하나만 있으면 @Autowired 어노테이션 없이도 자동 주입됩니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 탐지된 생성자 주입 정보 배열
     */
    public detectSingleConstructorInjection(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            // null 체크
            if (!classInfo || !classInfo.constructors) {
                return injections;
            }

            // 생성자가 정확히 하나인 경우만 처리
            if (classInfo.constructors.length === 1) {
                const constructor = classInfo.constructors[0];
                
                // 매개변수가 있는 경우에만 주입으로 간주
                if (constructor.parameters && constructor.parameters.length > 0) {
                    for (const parameter of constructor.parameters) {
                        const injection: InjectionInfo = {
                            targetType: parameter.type,
                            targetName: parameter.name,
                            injectionType: InjectionType.CONSTRUCTOR,
                            position: parameter.position || constructor.position,
                            range: constructor.range
                        };
                        injections.push(injection);
                    }
                }
            }

        } catch (error) {
            // 에러 발생 시 빈 배열 반환 (로깅은 추후 추가)
        }

        return injections;
    }

    /**
     * @Autowired가 붙은 생성자 주입을 탐지합니다.
     * 다중 생성자가 있는 경우 @Autowired가 붙은 생성자를 찾아 처리합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 탐지된 @Autowired 생성자 주입 정보 배열
     */
    public detectAutowiredConstructorInjection(classInfo: ClassInfo): InjectionInfo[] {
        const injections: InjectionInfo[] = [];

        try {
            // null 체크
            if (!classInfo || !classInfo.constructors) {
                return injections;
            }

            // @Autowired가 붙은 첫 번째 생성자 찾기
            const autowiredConstructor = classInfo.constructors.find(constructor => 
                constructor.hasAutowiredAnnotation
            );

            if (autowiredConstructor && autowiredConstructor.parameters) {
                for (const parameter of autowiredConstructor.parameters) {
                    const injection: InjectionInfo = {
                        targetType: parameter.type,
                        targetName: parameter.name,
                        injectionType: InjectionType.CONSTRUCTOR,
                        position: parameter.position || autowiredConstructor.position,
                        range: autowiredConstructor.range
                    };
                    injections.push(injection);
                }
            }

        } catch (error) {
            // 에러 발생 시 빈 배열 반환
        }

        return injections;
    }

    /**
     * 모든 클래스에서 생성자 주입을 탐지합니다.
     * 단일 생성자 주입과 @Autowired 생성자 주입을 모두 처리합니다.
     * 
     * @param classes - 분석할 클래스 정보 배열
     * @returns 탐지된 모든 생성자 주입 정보 배열
     */
    public detectAllConstructorInjections(classes: ClassInfo[]): InjectionInfo[] {
        const allInjections: InjectionInfo[] = [];

        try {
            if (!classes || classes.length === 0) {
                return allInjections;
            }

            for (const classInfo of classes) {
                // 단일 생성자 주입 탐지
                const singleConstructorInjections = this.detectSingleConstructorInjection(classInfo);
                allInjections.push(...singleConstructorInjections);

                // @Autowired 생성자 주입 탐지 (단일 생성자 주입과 중복되지 않도록)
                if (!singleConstructorInjections.length) {
                    const autowiredConstructorInjections = this.detectAutowiredConstructorInjection(classInfo);
                    allInjections.push(...autowiredConstructorInjections);
                }
            }

        } catch (error) {
            // 에러 발생 시 현재까지 수집된 주입 정보 반환
        }

        return allInjections;
    }
} 