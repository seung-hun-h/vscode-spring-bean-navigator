import { ClassInfo, InjectionInfo } from '../models/spring-types';
import { IInjectionDetector } from './injection-detector';
import { ErrorHandler } from '../parsers/core/parser-errors';

/**
 * 모든 Injection Detector들의 공통 로직을 추상화한 Base 클래스입니다.
 * Template Method Pattern을 사용하여 공통 로직을 제공하고,
 * 각 구체 클래스에서는 특화된 탐지 로직만 구현하도록 합니다.
 */
export abstract class AbstractInjectionDetector implements IInjectionDetector {
    
    /**
     * 추상 클래스의 이름을 반환합니다. 에러 로깅에 사용됩니다.
     * 각 구체 클래스에서 오버라이드해야 합니다.
     */
    protected abstract getDetectorName(): string;

    /**
     * 단일 클래스에서 주입 정보를 탐지하는 추상 메서드입니다.
     * 각 구체 클래스에서 특화된 탐지 로직을 구현해야 합니다.
     * 
     * @param classInfo - 분석할 클래스 정보
     * @returns 탐지된 주입 정보 배열
     */
    protected abstract detectInjectionsForClass(classInfo: ClassInfo): InjectionInfo[];

    /**
     * 모든 클래스에서 주입 정보를 탐지합니다.
     * Template Method Pattern을 사용하여 공통 로직을 제공합니다.
     * 
     * @param classes - 분석할 클래스 정보 배열
     * @returns 탐지된 모든 주입 정보 배열
     */
    public detectAllInjections(classes: ClassInfo[]): InjectionInfo[] {
        const allInjections: InjectionInfo[] = [];

        try {
            // 1. Input validation (공통 로직)
            if (!this.validateInput(classes)) {
                return allInjections;
            }

            // 2. 각 클래스별 탐지 처리 (공통 로직)
            for (const classInfo of classes) {
                try {
                    // 3. 클래스별 null 체크 (공통 로직)
                    if (!this.validateClassInfo(classInfo)) {
                        continue;
                    }

                    // 4. 구체 클래스의 특화된 탐지 로직 호출 (Template Method)
                    const classInjections = this.detectInjectionsForClass(classInfo);
                    
                    // 5. 결과 수집 (공통 로직)
                    if (classInjections && classInjections.length > 0) {
                        allInjections.push(...classInjections);
                    }

                } catch (classError) {
                    // 6. 개별 클래스 에러 처리 (공통 로직)
                    this.handleClassProcessingError(classError, classInfo);
                    // 개별 클래스 실패 시에도 계속 진행
                    continue;
                }
            }

        } catch (error) {
            // 7. 전체 처리 에러 처리 (공통 로직)
            this.handleOverallProcessingError(error, classes, allInjections);
        }

        return allInjections;
    }

    /**
     * 입력 매개변수를 검증합니다.
     * 
     * @param classes - 검증할 클래스 배열
     * @returns 유효한 입력이면 true
     */
    protected validateInput(classes: ClassInfo[]): boolean {
        if (!classes || !Array.isArray(classes) || classes.length === 0) {
            return false;
        }
        return true;
    }

    /**
     * 개별 클래스 정보를 검증합니다.
     * 
     * @param classInfo - 검증할 클래스 정보
     * @returns 유효한 클래스 정보면 true
     */
    protected validateClassInfo(classInfo: ClassInfo): boolean {
        return classInfo != null && typeof classInfo === 'object';
    }

    /**
     * 개별 클래스 처리 중 발생한 에러를 처리합니다.
     * 
     * @param error - 발생한 에러
     * @param classInfo - 처리 중이던 클래스 정보
     */
    protected handleClassProcessingError(error: any, classInfo: ClassInfo): void {
        const parsingError = ErrorHandler.handleParsingError(
            error, 
            `${this.getDetectorName()} - 개별 클래스 처리`
        );
        ErrorHandler.logError(parsingError, { 
            detectorName: this.getDetectorName(),
            className: classInfo?.name || 'Unknown',
            classFileUri: classInfo?.fileUri?.toString() || 'Unknown'
        });
    }

    /**
     * 전체 처리 중 발생한 에러를 처리합니다.
     * 
     * @param error - 발생한 에러
     * @param classes - 처리 중이던 클래스 배열
     * @param allInjections - 현재까지 수집된 주입 정보들
     */
    protected handleOverallProcessingError(
        error: any, 
        classes: ClassInfo[], 
        allInjections: InjectionInfo[]
    ): void {
        const parsingError = ErrorHandler.handleParsingError(
            error, 
            `${this.getDetectorName()} - 전체 탐지 처리`
        );
        ErrorHandler.logError(parsingError, { 
            detectorName: this.getDetectorName(),
            totalClasses: classes?.length || 0,
            processedInjections: allInjections.length,
            errorLocation: '전체 처리 단계'
        });
    }

    /**
     * 특정 조건을 만족하는 어노테이션을 찾는 헬퍼 메서드입니다.
     * 
     * @param annotations - 검색할 어노테이션 배열
     * @param predicate - 검색 조건 함수
     * @returns 조건을 만족하는 첫 번째 어노테이션 또는 undefined
     */
    protected findAnnotation<T>(
        annotations: T[], 
        predicate: (annotation: T) => boolean
    ): T | undefined {
        if (!annotations || !Array.isArray(annotations)) {
            return undefined;
        }
        return annotations.find(predicate);
    }

    /**
     * 배열이 null이거나 empty인지 확인하는 헬퍼 메서드입니다.
     * 
     * @param array - 확인할 배열
     * @returns null이거나 empty이면 true
     */
    protected isNullOrEmpty<T>(array: T[]): boolean {
        return !array || !Array.isArray(array) || array.length === 0;
    }

    /**
     * 안전하게 배열에서 필터링을 수행하는 헬퍼 메서드입니다.
     * 
     * @param array - 필터링할 배열
     * @param predicate - 필터링 조건
     * @returns 필터링된 배열 (입력이 null인 경우 빈 배열)
     */
    protected safeFilter<T>(array: T[], predicate: (item: T) => boolean): T[] {
        if (this.isNullOrEmpty(array)) {
            return [];
        }
        return array.filter(predicate);
    }

    /**
     * 안전하게 배열을 매핑하는 헬퍼 메서드입니다.
     * 
     * @param array - 매핑할 배열
     * @param mapper - 매핑 함수
     * @returns 매핑된 배열 (입력이 null인 경우 빈 배열)
     */
    protected safeMap<T, R>(array: T[], mapper: (item: T) => R): R[] {
        if (this.isNullOrEmpty(array)) {
            return [];
        }
        return array.map(mapper);
    }
} 