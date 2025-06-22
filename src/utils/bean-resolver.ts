import { BeanDefinition, BeanResolutionResult, ParameterInfo, ConstructorInfo, MethodInfo } from '../models/spring-types';

/**
 * Spring Bean 해결을 담당하는 클래스
 * 
 * 타입 기반 Bean 검색, 인터페이스 구현체 매핑, 다중 구현체 처리 등을 수행합니다.
 */
export class BeanResolver {
    /** Bean 이름별 정의 매핑 */
    private beansByName: Map<string, BeanDefinition> = new Map();
    
    /** Bean 타입별 정의 매핑 */
    private beansByType: Map<string, BeanDefinition[]> = new Map();
    
    /** 인터페이스별 구현체 매핑 */
    private beansByInterface: Map<string, BeanDefinition[]> = new Map();

    /**
     * Bean 정의를 추가하고 인덱스를 업데이트합니다.
     * 
     * @param bean - 추가할 Bean 정의
     */
    public addBeanDefinition(bean: BeanDefinition): void {
        // 이름별 매핑에 추가
        this.beansByName.set(bean.name, bean);
        
        // 타입별 매핑에 추가
        this.addToTypeMapping(bean.type, bean);
        
        // 인터페이스별 매핑에 추가 (확장 정보가 있는 경우)
        const interfaces = (bean as any).interfaces as string[] | undefined;
        if (interfaces && Array.isArray(interfaces)) {
            for (const interfaceName of interfaces) {
                this.addToInterfaceMapping(interfaceName, bean);
            }
        }
    }

    /**
     * Bean 이름으로 Bean 정의를 찾습니다.
     * 
     * @param name - 찾을 Bean 이름
     * @returns Bean 정의 또는 undefined
     */
    public findBeanByName(name: string): BeanDefinition | undefined {
        if (!name || name.trim() === '') {
            return undefined;
        }
        
        return this.beansByName.get(name);
    }

    /**
     * Bean 타입으로 Bean 정의들을 찾습니다.
     * 
     * @param type - 찾을 Bean 타입
     * @returns 매칭되는 Bean 정의들
     */
    public findBeansByType(type: string): BeanDefinition[] {
        if (!type || type.trim() === '') {
            return [];
        }
        
        // 직접 타입 매칭
        const directMatches = this.beansByType.get(type) || [];
        
        // 인터페이스 매칭도 시도
        const interfaceMatches = this.beansByInterface.get(type) || [];
        
        // 중복 제거하여 결합
        const allMatches = [...directMatches];
        for (const interfaceMatch of interfaceMatches) {
            if (!allMatches.some(match => match.name === interfaceMatch.name)) {
                allMatches.push(interfaceMatch);
            }
        }
        
        return allMatches;
    }

    /**
     * 인터페이스명으로 구현체 Bean들을 찾습니다.
     * 
     * @param interfaceName - 찾을 인터페이스 이름
     * @returns 구현체 Bean 정의들
     */
    public findBeansByInterface(interfaceName: string): BeanDefinition[] {
        if (!interfaceName || interfaceName.trim() === '') {
            return [];
        }
        
        return this.beansByInterface.get(interfaceName) || [];
    }

    /**
     * 주입을 위한 Bean을 해결합니다.
     * 
     * Spring의 Bean 해결 규칙을 따름:
     * 1. 정확한 타입 매치 우선 (컬렉션 타입도 직접 매칭 시도)
     * 2. 컬렉션 타입이면서 직접 매칭되지 않는 경우 제네릭 타입의 모든 Bean들을 반환
     * 3. 단일 후보면 자동 해결
     * 4. 다중 후보면 사용자 선택 필요
     * 
     * @param targetType - 주입할 타입
     * @returns Bean 해결 결과
     */
    public resolveBeanForInjection(targetType: string): BeanResolutionResult {
        return this.resolveBeanForInjectionWithName(targetType, undefined);
    }

    /**
     * 타입과 이름을 기반으로 Bean을 해결합니다.
     * 
     * Spring의 Bean 해결 규칙:
     * 1. 타입이 일치하는 Bean이 하나면 그것을 주입
     * 2. 같은 타입의 Bean이 여러 개면 매개변수 이름과 Bean 이름을 매칭
     * 3. 컬렉션 타입 처리
     * 
     * @param targetType - 주입할 타입
     * @param targetName - 주입 대상 이름 (매개변수명 등)
     * @returns Bean 해결 결과
     */
    public resolveBeanForInjectionWithName(targetType: string, targetName?: string): BeanResolutionResult {
        // 먼저 정확한 타입 매칭 시도 (컬렉션 타입 포함)
        const directCandidates = this.findBeansByType(targetType);
        
        // 직접 매칭된 Bean이 있으면 그것을 우선 사용
        if (directCandidates.length > 0) {
            if (directCandidates.length === 1) {
                return {
                    resolved: directCandidates[0],
                    candidates: directCandidates
                };
            } else {
                // 다중 후보가 있는 경우 이름 기반 매칭 시도
                if (targetName) {
                    const nameMatchedBean = this.findBeanByNameFromCandidates(directCandidates, targetName);
                    if (nameMatchedBean) {
                        return {
                            resolved: nameMatchedBean,
                            candidates: directCandidates
                        };
                    }
                }
                
                // 이름 매칭도 실패한 경우 모든 후보 반환
                return {
                    resolved: undefined,
                    candidates: directCandidates
                };
            }
        }

        // 직접 매칭되지 않고 컬렉션 타입인 경우 제네릭 타입의 Bean들 찾기
        if (this.isCollectionType(targetType)) {
            return this.resolveCollectionBeans(targetType);
        }
        
        // 매칭되는 Bean이 없는 경우
        return {
            resolved: undefined,
            candidates: []
        };
    }

    /**
     * 모든 Bean 정의 캐시를 지웁니다.
     */
    public clearCache(): void {
        this.beansByName.clear();
        this.beansByType.clear();
        this.beansByInterface.clear();
    }

    /**
     * 저장된 모든 Bean 정의를 반환합니다.
     * 
     * @returns 모든 Bean 정의들
     */
    public getAllBeans(): BeanDefinition[] {
        return Array.from(this.beansByName.values());
    }

    /**
     * 저장된 Bean 정의의 개수를 반환합니다.
     * 
     * @returns Bean 정의 개수
     */
    public getBeanCount(): number {
        return this.beansByName.size;
    }

    /**
     * 타입별 매핑에 Bean을 추가합니다.
     * 
     * @param type - Bean 타입
     * @param bean - Bean 정의
     */
    private addToTypeMapping(type: string, bean: BeanDefinition): void {
        const existing = this.beansByType.get(type) || [];
        
        // 기존 Bean과 같은 이름이면 교체, 아니면 추가
        const filteredExisting = existing.filter(b => b.name !== bean.name);
        filteredExisting.push(bean);
        
        this.beansByType.set(type, filteredExisting);
    }

    /**
     * 인터페이스별 매핑에 Bean을 추가합니다.
     * 
     * @param interfaceName - 인터페이스 이름
     * @param bean - Bean 정의
     */
    private addToInterfaceMapping(interfaceName: string, bean: BeanDefinition): void {
        const existing = this.beansByInterface.get(interfaceName) || [];
        
        // 기존 Bean과 같은 이름이면 교체, 아니면 추가
        const filteredExisting = existing.filter(b => b.name !== bean.name);
        filteredExisting.push(bean);
        
        this.beansByInterface.set(interfaceName, filteredExisting);
    }

    /**
     * 매개변수 정보를 기반으로 Bean을 해결합니다. (Phase 2)
     * 
     * Spring의 Bean 해결 규칙을 따름:
     * 1. 매개변수 타입으로 Bean 검색
     * 2. 정확한 타입 매치 우선
     * 3. 인터페이스 구현체 매치 지원
     * 4. 단일 후보면 자동 해결, 다중 후보면 사용자 선택 필요
     * 
     * @param parameter - 해결할 매개변수 정보
     * @returns Bean 해결 결과
     */
    public resolveBeanForParameter(parameter: ParameterInfo): BeanResolutionResult {
        if (!parameter || !parameter.type || parameter.type.trim() === '') {
            return {
                resolved: undefined,
                candidates: []
            };
        }

        return this.resolveBeanForInjection(parameter.type);
    }

    /**
     * 생성자의 모든 매개변수에 대해 Bean을 해결합니다. (Phase 2)
     * 
     * @param constructor - 해결할 생성자 정보
     * @returns 각 매개변수에 대한 Bean 해결 결과 배열
     */
    public resolveBeanForConstructor(constructor: ConstructorInfo): BeanResolutionResult[] {
        if (!constructor || !constructor.parameters) {
            return [];
        }

        return constructor.parameters.map(parameter => 
            this.resolveBeanForParameter(parameter)
        );
    }

    /**
     * 메서드의 모든 매개변수에 대해 Bean을 해결합니다. (Phase 2)
     * 
     * @param method - 해결할 메서드 정보
     * @returns 각 매개변수에 대한 Bean 해결 결과 배열
     */
    public resolveBeanForMethod(method: MethodInfo): BeanResolutionResult[] {
        if (!method || !method.parameters) {
            return [];
        }

        return method.parameters.map(parameter => 
            this.resolveBeanForParameter(parameter)
        );
    }

    /**
     * 타입이 컬렉션 타입인지 확인합니다.
     * 
     * @param type - 확인할 타입
     * @returns 컬렉션 타입 여부
     */
    public isCollectionType(type: string): boolean {
        if (!type) {
            return false;
        }
        
        // Spring에서 지원하는 컬렉션 타입들
        const collectionPatterns = [
            /^List<.*>$/,
            /^Set<.*>$/,
            /^Collection<.*>$/,
            /^Map<.*,.*>$/
        ];
        
        const trimmedType = type.trim();
        return collectionPatterns.some(pattern => pattern.test(trimmedType));
    }

    /**
     * 컬렉션 타입에서 제네릭 타입을 추출합니다.
     * 
     * @param collectionType - 컬렉션 타입 (예: List<MessageService>)
     * @returns 추출된 제네릭 타입 (예: MessageService)
     */
    public extractGenericType(collectionType: string): string | undefined {
        if (!collectionType) return undefined;
        
        const trimmed = collectionType.trim();
        
        // <와 > 사이의 내용을 찾기 위해 괄호 카운팅 사용
        const openIndex = trimmed.indexOf('<');
        if (openIndex === -1) return undefined;
        
        let bracketCount = 0;
        let closeIndex = -1;
        
        for (let i = openIndex; i < trimmed.length; i++) {
            if (trimmed[i] === '<') {
                bracketCount++;
            } else if (trimmed[i] === '>') {
                bracketCount--;
                if (bracketCount === 0) {
                    closeIndex = i;
                    break;
                }
            }
        }
        
        if (closeIndex === -1) return undefined;
        
        const genericContent = trimmed.substring(openIndex + 1, closeIndex).trim();
        
        // Map<String, MessageService> 형태에서 두 번째 타입 추출
        if (trimmed.startsWith('Map<')) {
            const commaIndex = this.findTopLevelComma(genericContent);
            if (commaIndex !== -1) {
                return genericContent.substring(commaIndex + 1).trim();
            }
        }
        
        // List<MessageService>, Set<UserService> 등에서 제네릭 타입 추출
        return genericContent;
    }
    
    /**
     * 최상위 레벨의 콤마를 찾습니다 (중첩된 제네릭 내부의 콤마는 무시)
     * 
     * @param content - 검색할 내용
     * @returns 최상위 콤마의 인덱스, 없으면 -1
     */
    private findTopLevelComma(content: string): number {
        let bracketCount = 0;
        
        for (let i = 0; i < content.length; i++) {
            if (content[i] === '<') {
                bracketCount++;
            } else if (content[i] === '>') {
                bracketCount--;
            } else if (content[i] === ',' && bracketCount === 0) {
                return i;
            }
        }
        
        return -1;
    }

    /**
     * 컬렉션 타입에 대한 Bean들을 해결합니다.
     * 
     * @param collectionType - 컬렉션 타입
     * @returns Bean 해결 결과
     */
    private resolveCollectionBeans(collectionType: string): BeanResolutionResult {
        const genericType = this.extractGenericType(collectionType);
        
        if (!genericType) {
            return {
                resolved: undefined,
                candidates: []
            };
        }
        
        // 제네릭 타입의 모든 Bean들을 찾음
        const candidates = this.findBeansByType(genericType);
        
        // 컬렉션의 경우 여러 개의 Bean이 있는 것이 정상이므로
        // 단일 Bean이어도 candidates로 처리
        return {
            resolved: undefined, // 컬렉션은 단일 resolved로 처리하지 않음
            candidates: candidates
        };
    }

    /**
     * 후보 Bean들 중에서 이름이 매칭되는 Bean을 찾습니다.
     * 
     * Spring의 이름 매칭 규칙:
     * 1. 정확한 Bean 이름 매칭
     * 2. camelCase 변환된 이름 매칭 (예: saveContentStep -> saveContentStep)
     * 
     * @param candidates - 후보 Bean들
     * @param targetName - 찾을 이름 (매개변수명 등)
     * @returns 매칭되는 Bean 또는 undefined
     */
    private findBeanByNameFromCandidates(candidates: BeanDefinition[], targetName: string): BeanDefinition | undefined {
        if (!candidates || candidates.length === 0 || !targetName || targetName.trim() === '') {
            return undefined;
        }

        const trimmedTargetName = targetName.trim();

        // 1. 정확한 Bean 이름 매칭
        const exactMatch = candidates.find(bean => bean.name === trimmedTargetName);
        if (exactMatch) {
            return exactMatch;
        }

        // 2. Bean 이름의 다양한 형태와 매칭 시도
        for (const candidate of candidates) {
            // Bean 이름이 매개변수 이름과 일치하는지 확인
            if (this.isNameMatching(candidate.name, trimmedTargetName)) {
                return candidate;
            }
        }

        return undefined;
    }

    /**
     * Bean 이름과 대상 이름이 매칭되는지 확인합니다.
     * 
     * @param beanName - Bean 이름
     * @param targetName - 대상 이름
     * @returns 매칭 여부
     */
    private isNameMatching(beanName: string, targetName: string): boolean {
        if (!beanName || !targetName) {
            return false;
        }

        // 정확한 매칭
        if (beanName === targetName) {
            return true;
        }

        // 대소문자 무시 매칭
        if (beanName.toLowerCase() === targetName.toLowerCase()) {
            return true;
        }

        // camelCase/PascalCase 변환 매칭
        // 예: SaveContentStep -> saveContentStep
        if (this.toCamelCase(beanName) === targetName || beanName === this.toCamelCase(targetName)) {
            return true;
        }

        return false;
    }

    /**
     * 문자열을 camelCase로 변환합니다.
     * 
     * @param str - 변환할 문자열
     * @returns camelCase로 변환된 문자열
     */
    private toCamelCase(str: string): string {
        if (!str || str.length === 0) {
            return str;
        }

        // 첫 글자를 소문자로
        return str.charAt(0).toLowerCase() + str.slice(1);
    }
} 