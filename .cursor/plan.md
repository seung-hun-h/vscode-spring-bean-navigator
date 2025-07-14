# FieldExtractor 리팩토링 계획

## 목표
FieldExtractor가 단일책임 원칙(SRP)을 위반하는 문제를 해결하기 위해 책임을 분리하고 기존 유틸리티 클래스를 활용하도록 리팩토링

## 현재 문제점
- CST 노드 탐색 로직이 FieldExtractor에 혼재
- 복잡한 타입 추출 로직이 FieldExtractor 내부에 구현
- CSTNavigator와 중복되는 토큰 수집 메서드 존재
- 637줄의 거대한 클래스로 여러 책임이 혼재

## 리팩토링 전략 (Tidy First)
1. **구조적 변경만 수행**: 기존 동작을 유지하면서 코드 구조 개선
2. **행동적 변경 없음**: 새로운 기능 추가 없음
3. **점진적 접근**: 한 번에 하나의 변경사항만 적용
4. **테스트 우선**: 각 변경 전 테스트 작성

## 단계별 계획

### Phase 1: 기존 CSTNavigator 활용 (구조적 변경)

#### 1.1 중복 메서드 제거
- [x] Test: `collectAllTokensFromNode`가 `CSTNavigator.collectTokensRecursively`와 동일한 결과를 반환하는지 확인
  - **완료**: CSTNavigator에 `extractAllTokens` 메서드 추가하여 동일한 동작 구현
- [x] Refactor: `collectAllTokensFromNode` 호출을 `CSTNavigator.extractAllTokens`로 대체
  - **완료**: FieldExtractor에 CSTNavigator 의존성 추가 및 메서드 호출 변경
- [x] Remove: `collectAllTokensFromNode` 메서드 제거
  - **완료**: 메서드 제거 및 관련 테스트 제거
- [x] Run all tests: 모든 테스트 통과 확인
  - **완료**: 499개 테스트 모두 통과
- [ ] Commit: `refactor: use CSTNavigator for token collection`

#### 1.2 CSTNavigator 확장
- [ ] Test: CSTNavigator에 `findNodeRecursively` 메서드 동작 테스트 작성
- [ ] Implement: CSTNavigator에 `findNodeRecursively` 메서드 추가
- [ ] Test: CSTNavigator에 `isNodeOfType` 메서드 동작 테스트 작성
- [ ] Implement: CSTNavigator에 `isNodeOfType` 메서드 추가
- [ ] Refactor: FieldExtractor의 `findNodeRecursively`를 CSTNavigator 호출로 대체
- [ ] Remove: FieldExtractor의 `findNodeRecursively` 메서드 제거
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `refactor: add node traversal methods to CSTNavigator`

### Phase 2: JavaTypeExtractor 생성 (구조적 변경)

#### 2.1 JavaTypeExtractor 클래스 생성
- [ ] Test: JavaTypeExtractor가 primitive 타입을 올바르게 추출하는지 테스트
  - [ ] int, boolean, char, byte, short, long, float, double 테스트
- [ ] Test: JavaTypeExtractor가 reference 타입을 올바르게 추출하는지 테스트
  - [ ] 단순 클래스명 (String, Integer 등)
  - [ ] 패키지 포함 타입 (java.util.List 등)
- [ ] Test: JavaTypeExtractor가 generic 타입을 올바르게 추출하는지 테스트
  - [ ] List<String>
  - [ ] Map<String, Integer>
  - [ ] 중첩 제네릭 List<Map<String, Object>>
- [ ] Create: `src/parsers/extractors/java-type-extractor.ts` 파일 생성
- [ ] Implement: `extractType` 메서드 구현
- [ ] Implement: `extractPrimitiveType` 메서드 구현
- [ ] Implement: `extractReferenceType` 메서드 구현
- [ ] Implement: `extractGenericArguments` 메서드 구현
- [ ] Run all tests: JavaTypeExtractor 테스트 통과 확인
- [ ] Commit: `feat: add JavaTypeExtractor class`

#### 2.2 FieldExtractor에서 타입 추출 로직 이동
- [ ] Test: FieldExtractor가 JavaTypeExtractor를 사용해도 동일한 결과를 반환하는지 확인
- [ ] Refactor: FieldExtractor 생성자에 JavaTypeExtractor 의존성 추가
- [ ] Refactor: `extractFieldType`이 JavaTypeExtractor를 사용하도록 변경
- [ ] Remove: `extractFullTypeText` private 메서드 제거
- [ ] Remove: `extractGenericTypeArguments` private 메서드 제거
- [ ] Remove: `findTypeRecursively` private 메서드 제거
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `refactor: move type extraction to JavaTypeExtractor`

### Phase 3: FieldExtractor 최종 정리 (구조적 변경)

#### 3.1 의존성 정리 및 구조 개선
- [ ] Test: 리팩토링된 FieldExtractor가 기존과 동일하게 동작하는지 통합 테스트
- [ ] Refactor: exploredNodes 캐싱 로직을 별도 메서드로 추출 (선택적)
- [ ] Refactor: 불필요한 try-catch 블록 정리
- [ ] Update: FieldExtractor의 JSDoc 주석 업데이트
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `refactor: clean up FieldExtractor structure`

#### 3.2 코드 품질 개선
- [ ] Test: 에러 처리가 올바르게 동작하는지 확인
- [ ] Refactor: 중복 코드 제거
- [ ] Refactor: 메서드 크기 축소 (필요시 helper 메서드 추출)
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `refactor: improve FieldExtractor code quality`

### Phase 4: 다른 Extractor들의 타입 추출 개선 (선택적)

#### 4.1 MethodExtractor 타입 추출 개선
- [ ] Test: MethodExtractor가 JavaTypeExtractor를 사용해도 동일한 결과를 반환하는지 확인
- [ ] Refactor: returnType 추출에 JavaTypeExtractor 활용
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `refactor: use JavaTypeExtractor in MethodExtractor`

#### 4.2 ConstructorExtractor 개선
- [ ] Test: 생성자 파라미터 타입 추출이 올바르게 동작하는지 확인
- [ ] Refactor: 필요시 JavaTypeExtractor 활용
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `refactor: improve ConstructorExtractor type handling`

## 예상 결과
- FieldExtractor: 637줄 → 약 300-350줄 (45% 감소)
- 명확한 책임 분리:
  - FieldExtractor: 필드 추출 및 조합
  - JavaTypeExtractor: Java 타입 파싱
  - CSTNavigator: CST 노드 탐색
- 재사용 가능한 JavaTypeExtractor로 다른 클래스들도 개선 가능
- 각 클래스가 단일 책임을 가지므로 테스트와 유지보수 용이

## 주의사항
- 모든 변경은 구조적 변경으로, 기존 동작을 변경하지 않음
- 각 단계마다 모든 테스트가 통과하는지 확인 필수
- 한 번에 하나의 리팩토링만 수행
- 커밋 메시지는 영어로 작성하고 50자 이내로 제한
- Red-Green-Refactor 사이클 준수

## 커밋 메시지 상세 설명 예시

필요시 다음과 같이 상세 설명 추가:

```
refactor: move type extraction to JavaTypeExtractor

- Extract type parsing logic from FieldExtractor
- Create dedicated class for Java type handling
- Reduce FieldExtractor size by ~200 lines
``` 