import { BeanDefinition, BeanResolutionResult } from '../models/spring-types';

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
     * 1. 정확한 타입 매치 우선
     * 2. 단일 후보면 자동 해결
     * 3. 다중 후보면 사용자 선택 필요
     * 
     * @param targetType - 주입할 타입
     * @returns Bean 해결 결과
     */
    public resolveBeanForInjection(targetType: string): BeanResolutionResult {
        const candidates = this.findBeansByType(targetType);

        console.log(this.beansByType.get('AskUgcService'));
        console.log(this.beansByType.get('AskUgcServiceImpl'));
        
        if (candidates.length === 0) {
            return {
                resolved: undefined,
                candidates: []
            };
        }
        
        if (candidates.length === 1) {
            return {
                resolved: candidates[0],
                candidates: candidates
            };
        }
        
        // 다중 후보가 있는 경우 자동 해결하지 않음
        return {
            resolved: undefined,
            candidates: candidates
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
} 