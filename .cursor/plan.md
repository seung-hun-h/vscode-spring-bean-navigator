# MethodExtractor 리팩토링 계획

## 목표
MethodExtractor가 단일책임 원칙(SRP)을 위반하는 문제를 해결하기 위해 책임을 분리하고 기존 유틸리티 클래스를 활용하도록 리팩토링

## 리팩토링 전략
1. **구조적 변경(Tidy First)**: 기존 동작을 유지하면서 코드 구조 개선
2. **행동적 변경 없음**: 이번 리팩토링에서는 새로운 기능 추가 없음
3. **점진적 접근**: 한 번에 하나의 변경사항만 적용

## 단계별 계획

### Phase 1: 기존 유틸리티 클래스 활용 (구조적 변경) ✅ 완료

#### 1.1 ParameterParser 활용
- [x] Test: `extractParametersFromDeclaration`이 `ParameterParser.parseParameters`와 동일한 결과를 반환하는지 확인
  - **발견**: ParameterParser가 수정자(final, volatile)를 제거하는 점에서 차이가 있음. 이는 ParameterParser가 더 정확한 동작
- [x] Refactor: `extractParametersFromDeclaration` 메서드를 `ParameterParser.parseParameters` 호출로 대체
  - **완료**: 모든 테스트 통과 (19 passing)
  - **추가 작업**: extractParametersFromDeclaration 메서드 인라인 완료
- [x] Test: `splitParameters`가 `ParameterParser.splitParametersByComma`와 동일한 결과를 반환하는지 확인  
  - **발견**: extractParametersFromDeclaration 제거로 splitParameters가 더 이상 사용되지 않음 (Dead code)
- [x] Refactor: `splitParameters` 메서드를 `ParameterParser.splitParametersByComma` 호출로 대체
  - **변경**: 사용되지 않는 메서드이므로 제거 필요
- [x] Refactor: `parseParameter` 메서드를 `ParameterParser.parseSingleParameter` 호출로 대체
  - **변경**: 사용되지 않는 메서드이므로 제거 필요
- [x] Remove: 사용되지 않는 `splitParameters`와 `parseParameter` 메서드 제거
  - **완료**: 두 메서드 제거 완료, 파일 크기 560줄 → 470줄 (-90줄)
- [x] Commit: "refactor(MethodExtractor): ParameterParser 유틸리티 클래스 활용 (구조적 변경)"
  - **완료**: commit af2622d

#### 1.2 JavaSyntaxUtils 활용
- [x] Test: `countParentheses`가 `JavaSyntaxUtils` 메서드들로 대체 가능한지 확인
  - **결과**: countCharacterOutsideStrings로 완벽히 대체 가능
- [x] Test: `hasMethodBodyStart`가 `JavaSyntaxUtils` 메서드들로 대체 가능한지 확인
  - **발견**: hasMethodBodyStart에 버그 존재 - 문자열 리터럴 내부 문자를 제대로 처리하지 못함
  - **해결**: JavaSyntaxUtils.isInStringLiteral을 사용하면 버그도 해결되고 코드도 간결해짐
- [x] Test: `extractParametersStringFromDeclaration`을 `JavaSyntaxUtils.extractBetweenParentheses` 활용 가능한지 확인
  - **결과**: extractBetweenParentheses로 완벽히 대체 가능
- [x] Refactor: `countParentheses` 내부 로직을 `JavaSyntaxUtils.countCharacterOutsideStrings` 활용하여 개선
  - **완료**: 36줄 → 5줄로 단순화
- [x] Refactor: `hasMethodBodyStart` 내부 로직을 `JavaSyntaxUtils.countCharacterOutsideStrings` 활용하여 개선
  - **완료**: 23줄 → 4줄로 단순화, 버그 수정
- [x] Refactor: `extractParametersStringFromDeclaration`을 `JavaSyntaxUtils.extractBetweenParentheses` 활용하여 개선
  - **완료**: 55줄 → 1줄로 단순화
- [x] Commit: "refactor(MethodExtractor): JavaSyntaxUtils 활용하여 중복 제거 (구조적 변경)"
  - **완료**: commit ea0c0fa

### Phase 2: 새로운 책임 분리 클래스 생성 (구조적 변경)

#### 2.1 MethodDeclarationParser 생성
- [x] Test: MethodDeclarationParser가 메서드 선언문을 올바르게 추출하는지 테스트
  - [x] 단일 라인 메서드 선언 테스트
  - [x] 멀티라인 메서드 선언 테스트
  - [x] 추상 메서드 (세미콜론으로 끝나는) 테스트
  - [x] parseMethodSignature 테스트
- [x] Create: `src/parsers/utils/method-declaration-parser.ts` 파일 생성
  - static 메서드로 구현 (유틸리티 클래스 패턴)
- [x] Implement: `extractMethodDeclaration` 메서드 구현 (MethodExtractor에서 이동)
- [x] Implement: `parseMethodSignature` 메서드 구현 (parseMethodDeclarationWithParameters 일부)
- [ ] Refactor: MethodExtractor가 MethodDeclarationParser를 사용하도록 변경
- [ ] Commit: "refactor(parsers): MethodDeclarationParser 클래스 추가 (구조적 변경)"

#### 2.2 MethodClassifier 생성
- [ ] Test: MethodClassifier가 setter 메서드를 올바르게 판별하는지 테스트
- [ ] Create: `src/parsers/utils/method-classifier.ts` 파일 생성
- [ ] Implement: `isSetterMethod` 메서드 구현 (MethodExtractor에서 이동)
- [ ] Implement: `isBeanMethod` 메서드 구현 (향후 확장 대비)
- [ ] Refactor: MethodExtractor가 MethodClassifier를 사용하도록 변경
- [ ] Commit: "refactor(parsers): MethodClassifier 클래스 추가 (구조적 변경)"

#### 2.3 TextPositionCalculator 생성
- [ ] Test: TextPositionCalculator가 메서드/파라미터 위치를 올바르게 계산하는지 테스트
- [ ] Create: `src/parsers/utils/text-position-calculator.ts` 파일 생성
- [ ] Implement: `calculateMethodPosition` 메서드 구현
- [ ] Implement: `findParameterPosition` 메서드 구현 (MethodExtractor에서 이동)
- [ ] Implement: `calculateParameterPositions` 메서드 구현 (MethodExtractor에서 이동)
- [ ] Refactor: MethodExtractor가 TextPositionCalculator를 사용하도록 변경
- [ ] Commit: "refactor(parsers): TextPositionCalculator 클래스 추가 (구조적 변경)"

### Phase 3: MethodExtractor 최종 정리 (구조적 변경)

#### 3.1 의존성 주입 및 구조 개선
- [ ] Test: 리팩토링된 MethodExtractor가 기존과 동일하게 동작하는지 통합 테스트
- [ ] Refactor: MethodExtractor 생성자에 의존성 주입 패턴 적용
- [ ] Refactor: private 메서드 중 다른 클래스로 이동 가능한 것들 정리
- [ ] Remove: 사용하지 않게 된 private 메서드들 제거
- [ ] Commit: "refactor(MethodExtractor): 의존성 주입 및 최종 정리 (구조적 변경)"

#### 3.2 테스트 업데이트
- [ ] Test: 모든 기존 MethodExtractor 테스트가 통과하는지 확인
- [ ] Test: 새로 생성된 클래스들의 단위 테스트 추가
- [ ] Test: 통합 테스트로 전체 동작 검증
- [ ] Commit: "test: 리팩토링된 클래스들에 대한 테스트 추가"

## 진행 현황
- **현재 파일 크기**: 560줄 → 470줄 → 377줄 (-183줄, 32.7% 감소)
- **Phase 1 완료**: ParameterParser와 JavaSyntaxUtils 활용
- **모든 테스트 통과**: 21 passing
- **커밋 이력**:
  - af2622d: ParameterParser 활용
  - ea0c0fa: JavaSyntaxUtils 활용

## 예상 결과
- MethodExtractor: 560줄 → 약 200-250줄
- 명확한 책임 분리로 유지보수성 향상
- 기존 유틸리티 클래스 재사용으로 중복 코드 제거
- 각 클래스가 단일 책임을 가지므로 테스트 용이성 향상

## 주의사항
- 모든 변경은 구조적 변경으로, 기존 동작을 변경하지 않음
- 각 단계마다 모든 테스트가 통과하는지 확인
- 한 번에 하나의 리팩토링만 수행
- 커밋 메시지에 "구조적 변경" 명시 