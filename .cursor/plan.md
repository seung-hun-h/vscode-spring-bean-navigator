# Java Parser Visitor 패턴 구현 계획 (Phase 1)

## 목표
현재 CST를 직접 탐색하는 복잡한 코드를 java-parser의 Visitor 패턴을 활용하여 간소화

## 현재 문제점
- `java-parser`로 CST만 생성하고, 모든 탐색 로직을 직접 구현
- 2000줄 이상의 복잡한 파싱 관련 코드
- CST 노드 구조를 수동으로 탐색하는 비효율적인 방식

## Phase 1: Visitor 패턴 구현

### 1.1 SpringInfoCollector 기본 구조 구현

#### 1.1.1 기본 Visitor 클래스 생성
- [x] Test: SpringInfoCollector가 BaseJavaCstVisitorWithDefaults를 상속하는지 확인
- [x] Create: `src/parsers/visitors/spring-info-collector.ts` 파일 생성
- [x] Implement: SpringInfoCollector 클래스 기본 구조
- [x] Run test: 클래스 생성 테스트 통과
- [x] Commit: `feat: create SpringInfoCollector visitor base`

#### 1.1.2 클래스 정보 수집 구현
- [x] Test: `visitClassDeclaration`이 클래스 이름을 올바르게 추출하는지 테스트
  ```typescript
  test('should extract class name from class declaration', () => {
    const source = 'public class UserService {}';
    const collector = new SpringInfoCollector(mockUri);
    // ... 클래스 이름이 'UserService'인지 확인
  });
  ```
- [x] Implement: `visitClassDeclaration` 메서드 구현 (최소 구현)
- [x] Run test: 테스트 통과 확인
- [ ] Test: 클래스의 패키지명을 올바르게 추출하는지 테스트
- [ ] Implement: 패키지명 추출 로직 추가
- [ ] Run test: 테스트 통과 확인
- [ ] Test: 클래스의 위치 정보(Position, Range)를 올바르게 추출하는지 테스트
- [ ] Implement: 위치 정보 추출 로직 추가
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: implement class declaration visitor`

### 1.2 어노테이션 추출 구현

#### 1.2.1 클래스 어노테이션 추출
- [ ] Test: @Service 어노테이션이 있는 클래스에서 어노테이션을 추출하는지 테스트
  ```typescript
  test('should extract @Service annotation from class', () => {
    const source = '@Service\npublic class UserService {}';
    // ... annotations 배열에 Service 어노테이션이 있는지 확인
  });
  ```
- [ ] Implement: 클래스 어노테이션 추출 로직 구현
- [ ] Run test: 테스트 통과 확인
- [ ] Test: @Component, @Repository, @Controller 어노테이션 추출 테스트
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Test: 어노테이션의 파라미터를 추출하는지 테스트 (@Service("userService"))
- [ ] Implement: 어노테이션 파라미터 추출 로직 구현
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: add class annotation extraction`

### 1.3 필드 정보 수집 구현

#### 1.3.1 필드 선언 방문자 구현
- [ ] Test: 필드 이름을 올바르게 추출하는지 테스트
  ```typescript
  test('should extract field name from field declaration', () => {
    const source = `
      public class UserService {
        private UserRepository userRepository;
      }
    `;
    // ... field name이 'userRepository'인지 확인
  });
  ```
- [ ] Implement: `visitFieldDeclaration` 메서드 기본 구현
- [ ] Run test: 테스트 통과 확인
- [ ] Test: 필드 타입을 올바르게 추출하는지 테스트
- [ ] Implement: 필드 타입 추출 로직 추가
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: implement field declaration visitor`

#### 1.3.2 @Autowired 필드 감지
- [ ] Test: @Autowired 어노테이션이 있는 필드를 감지하는지 테스트
  ```typescript
  test('should detect @Autowired annotation on field', () => {
    const source = `
      public class UserService {
        @Autowired
        private UserRepository userRepository;
      }
    `;
    // ... field의 annotations에 Autowired가 있는지 확인
  });
  ```
- [ ] Implement: 필드 어노테이션 추출 로직 구현
- [ ] Run test: 테스트 통과 확인
- [ ] Test: @Value, @Qualifier 등 다른 필드 어노테이션 추출 테스트
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: add field annotation detection`

### 1.4 메서드 정보 수집 구현

#### 1.4.1 메서드 선언 방문자 구현
- [ ] Test: 메서드 이름을 올바르게 추출하는지 테스트
  ```typescript
  test('should extract method name from method declaration', () => {
    const source = `
      public class UserService {
        public User findById(Long id) { return null; }
      }
    `;
    // ... method name이 'findById'인지 확인
  });
  ```
- [ ] Implement: `visitMethodDeclaration` 메서드 기본 구현
- [ ] Run test: 테스트 통과 확인
- [ ] Commit: `feat: implement method declaration visitor`

#### 1.4.2 @Bean 메서드 감지
- [ ] Test: @Bean 어노테이션이 있는 메서드를 감지하는지 테스트
  ```typescript
  test('should detect @Bean annotation on method', () => {
    const source = `
      @Configuration
      public class AppConfig {
        @Bean
        public DataSource dataSource() { return null; }
      }
    `;
    // ... method의 annotations에 Bean이 있는지 확인
  });
  ```
- [ ] Implement: 메서드 어노테이션 추출 로직 구현
- [ ] Run test: 테스트 통과 확인
- [ ] Test: setter 메서드의 @Autowired 감지 테스트
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: add method annotation detection`

### 1.5 생성자 정보 수집 구현

#### 1.5.1 생성자 선언 방문자 구현
- [ ] Test: 생성자를 올바르게 감지하는지 테스트
  ```typescript
  test('should detect constructor declaration', () => {
    const source = `
      public class UserService {
        public UserService(UserRepository repository) {}
      }
    `;
    // ... constructor가 감지되는지 확인
  });
  ```
- [ ] Implement: `visitConstructorDeclaration` 메서드 구현
- [ ] Run test: 테스트 통과 확인
- [ ] Test: 생성자 파라미터 정보 추출 테스트
- [ ] Implement: 생성자 파라미터 추출 로직 구현
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: implement constructor declaration visitor`

#### 1.5.2 생성자 주입 감지
- [ ] Test: @Autowired 생성자를 감지하는지 테스트
- [ ] Test: Lombok @RequiredArgsConstructor 감지 테스트
- [ ] Implement: 생성자 주입 감지 로직 구현
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: add constructor injection detection`

### 1.6 통합 테스트

#### 1.6.1 실제 Java 파일 파싱 테스트
- [ ] Test: 복잡한 실제 Java 클래스를 파싱하는 통합 테스트
  ```typescript
  test('should parse complete Spring service class', () => {
    const source = JavaSampleGenerator.complexSpringService();
    const collector = new SpringInfoCollector(mockUri);
    // ... 모든 정보가 올바르게 추출되는지 확인
  });
  ```
- [ ] Run test: 통합 테스트 통과 확인
- [ ] Test: 여러 클래스가 있는 파일 파싱 테스트
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `test: add integration tests for SpringInfoCollector`

### 1.7 JavaFileParser와 통합

#### 1.7.1 JavaFileParser에서 SpringInfoCollector 사용
- [ ] Test: JavaFileParser가 SpringInfoCollector를 사용해도 동일한 결과를 반환하는지 테스트
- [ ] Implement: JavaFileParser에 SpringInfoCollector 통합 (기존 코드와 병행)
- [ ] Run test: 결과 비교 테스트 통과 확인
- [ ] Test: 에러 처리가 올바르게 동작하는지 테스트
- [ ] Run all tests: 모든 테스트 통과 확인
- [ ] Commit: `feat: integrate SpringInfoCollector with JavaFileParser`

## 예상 결과
- SpringInfoCollector: 약 200-250줄의 간결한 Visitor 구현
- 한 번의 CST 순회로 모든 정보 수집
- java-parser의 location 정보 활용으로 위치 계산 간소화
- 명확한 Visitor 패턴으로 유지보수 용이

## 주의사항
- 모든 변경은 TDD 방식으로 진행 (Red → Green → Refactor)
- 각 테스트는 하나의 동작만 검증
- 최소한의 코드로 테스트 통과
- 기존 구현과 병행하여 결과 비교
- 커밋은 작은 단위로 자주 수행 