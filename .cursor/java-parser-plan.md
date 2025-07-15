# Java Parser 적용 계획

## 개요
현재 프로젝트는 `java-parser` 라이브러리를 설치했지만, CST를 생성만 하고 실제 정보 추출은 모두 직접 구현한 복잡한 코드로 처리하고 있습니다. 이를 `java-parser`의 Visitor 패턴을 활용하여 대폭 간소화하는 계획입니다.

## 현재 상황 분석

### 문제점
1. `java-parser`로 CST만 생성하고, 모든 탐색 로직을 직접 구현
2. 2000줄 이상의 복잡한 파싱 관련 코드
3. CST 노드 구조를 수동으로 탐색하는 비효율적인 방식
4. 생성자와 메서드는 CST를 사용하지 않고 정규식으로 파싱

### 제거 가능한 클래스들
- `CSTNavigator` (318줄) - Visitor 패턴으로 대체
- `PositionCalculator` (200+줄) - CST 노드의 location 속성 직접 사용
- `JavaTypeExtractor` (225줄) - Visitor에서 직접 처리
- `FieldExtractor` (456줄) - Visitor의 fieldDeclaration 메서드로 대체
- `ClassExtractor` (343줄) - Visitor의 classDeclaration 메서드로 대체
- `AnnotationParser` (462줄) - Visitor에서 직접 처리
- `MethodExtractor` (200+줄) - Visitor의 methodDeclaration 메서드로 대체
- 각종 유틸리티 클래스들의 복잡한 로직

## 적용 계획

### Phase 1: Visitor 패턴 구현 (1-2일)

#### 1.1 SpringInfoCollector 구현
```typescript
// src/parsers/visitors/spring-info-collector.ts
class SpringInfoCollector extends BaseJavaCstVisitorWithDefaults {
    // 클래스, 필드, 메서드, 어노테이션 정보 수집
}
```

주요 메서드:
- `visitClassDeclaration()` - 클래스 정보 수집
- `visitFieldDeclaration()` - 필드 및 @Autowired 정보 수집
- `visitMethodDeclaration()` - 메서드 및 @Bean 정보 수집
- `visitConstructorDeclaration()` - 생성자 주입 정보 수집
- `visitAnnotation()` - 어노테이션 정보 수집

#### 1.2 테스트 작성
- 기존 테스트 케이스를 새로운 Visitor 기반 구현에 맞게 수정
- 동일한 결과를 보장하는지 확인

### Phase 2: JavaFileParser 리팩토링 (1일)

#### 2.1 기존 Extractor 의존성 제거
```typescript
export class JavaFileParser {
    public async parseJavaFile(fileUri: vscode.Uri, content: string): Promise<JavaFileParseResult> {
        const { parse } = await import('java-parser');
        const cst = parse(content);
        
        const collector = new SpringInfoCollector(fileUri);
        collector.visit(cst);
        
        return {
            classes: collector.classes,
            injections: collector.injections,
            beanDefinitions: collector.beanDefinitions,
            errors: []
        };
    }
}
```

#### 2.2 단계적 마이그레이션
1. 새로운 구현과 기존 구현을 병행 실행
2. 결과 비교 및 검증
3. 문제 없으면 기존 코드 제거

### Phase 3: 불필요한 코드 제거 (1일)

#### 3.1 제거 대상
- `/src/parsers/core/` 디렉토리 (parser-errors.ts 제외)
- `/src/parsers/extractors/` 디렉토리 전체
- `/src/parsers/utils/` 디렉토리의 대부분

#### 3.2 유지 대상
- `parser-errors.ts` - 에러 처리는 여전히 필요
- `SpringBeanDetector` - 비즈니스 로직
- 기타 Spring 관련 탐지 로직

### Phase 4: 성능 최적화 (1일)

#### 4.1 캐싱 구현
```typescript
class CachedJavaParser {
    private cache = new Map<string, JavaFileParseResult>();
    
    async parse(fileUri: vscode.Uri, content: string): Promise<JavaFileParseResult> {
        const hash = this.computeHash(content);
        if (this.cache.has(hash)) {
            return this.cache.get(hash)!;
        }
        // ... 파싱 로직
    }
}
```

#### 4.2 병렬 처리
- 여러 파일을 동시에 파싱할 때 Promise.all 활용

### Phase 5: 문서화 및 마무리 (0.5일)

#### 5.1 문서 업데이트
- README 업데이트
- 아키텍처 문서 작성
- API 문서 갱신

#### 5.2 코드 정리
- 불필요한 import 제거
- 코드 포맷팅
- 최종 테스트

## 예상 결과

### 코드 감소
- 현재: 2000+ 줄의 파싱 관련 코드
- 개선 후: 350줄 이하 (85% 감소)

### 구조 개선
```
개선 전:
src/parsers/
├── core/ (500+ 줄)
├── extractors/ (1500+ 줄)
├── utils/ (300+ 줄)
└── java-file-parser.ts

개선 후:
src/parsers/
├── visitors/
│   └── spring-info-collector.ts (200줄)
├── java-file-parser.ts (100줄)
└── parser-errors.ts (유지)
```

### 성능 향상
- 한 번의 CST 순회로 모든 정보 수집
- 불필요한 재귀 탐색 제거
- 메모리 사용량 감소

### 유지보수성 향상
- Visitor 패턴으로 명확한 구조
- java-parser 업데이트 시 자동으로 개선사항 반영
- 새로운 Java 문법 지원 시 추가 작업 불필요

## 위험 요소 및 대응 방안

### 1. 기능 누락 위험
- 대응: 기존 테스트 케이스 100% 통과 확인
- 병행 실행으로 결과 비교

### 2. 성능 저하 위험
- 대응: 벤치마크 테스트 실시
- 필요시 캐싱 강화

### 3. java-parser API 변경
- 대응: 특정 버전 고정
- 마이그레이션 가이드 작성

## 일정
- 총 소요 기간: 4-5일
- Phase 1-2: 2-3일 (핵심 구현)
- Phase 3-5: 2일 (정리 및 최적화)

## 참고 자료
- [java-parser npm 문서](https://www.npmjs.com/package/java-parser)
- [Chevrotain Visitor 패턴 가이드](https://chevrotain.io/docs/guide/concrete_syntax_tree.html#cst-visitor)
- 현재 프로젝트의 테스트 케이스들 