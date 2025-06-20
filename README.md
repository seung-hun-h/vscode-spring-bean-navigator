# Spring Bean Navigator

Spring Framework 개발자를 위한 VSCode Extension입니다. Java 파일에서 @Autowired 어노테이션이 붙은 필드에 CodeLens를 표시하여 해당 Bean의 구현체로 쉽게 이동할 수 있습니다.

## 주요 기능

- **@Autowired 필드 탐지**: @Autowired 어노테이션이 붙은 필드를 자동으로 감지합니다
- **Spring Bean 탐지**: @Service, @Component, @Repository, @Controller, @RestController, @Configuration 어노테이션이 붙은 클래스를 Bean으로 인식합니다
- **CodeLens 표시**: @Autowired 필드 옆에 "Go to Bean" 링크를 표시합니다
- **Bean 구현체로 이동**: CodeLens를 클릭하면 해당 Bean의 구현체 클래스로 이동합니다
- **다중 Bean 후보 지원**: 여러 구현체가 있는 경우 선택 UI를 제공합니다

## 지원하는 Spring 어노테이션

- `@Autowired` (필드 주입)
- `@Service`
- `@Component` 
- `@Repository`
- `@Controller`
- `@RestController`
- `@Configuration`
- `@Bean` (메소드)

## 사용 방법

1. Java 파일을 열고 @Autowired 필드를 확인합니다
2. 필드 옆에 표시되는 CodeLens를 클릭합니다
3. Bean 구현체 클래스로 자동 이동됩니다

## 명령어

- `Spring Bean Navigator: Refresh Spring Bean Definitions` - Bean 정의를 새로고침합니다
- `Spring Bean Navigator: Show Bean Count` - 발견된 Bean 개수를 표시합니다

## 시스템 요구사항

- Visual Studio Code 1.101.0 이상
- Java 파일 (*.java)

## 개발 단계

- **Phase 1**: @Autowired 어노테이션 탐지 ✅
- **Phase 2**: 생성자 주입 및 Setter 주입 지원 (예정)
- **Phase 3**: Lombok 어노테이션 지원 (예정)
- **Phase 4**: Kotlin 지원 확장 (예정)

## 알려진 이슈

- 현재 필드 주입(@Autowired)만 지원합니다
- 생성자 주입은 향후 업데이트에서 지원 예정입니다

## 릴리즈 노트

### 0.0.1

- 초기 릴리즈
- @Autowired 필드 탐지 기능
- Spring Bean 탐지 기능
- CodeLens를 통한 Bean 네비게이션 기능

---

**Spring Framework 개발을 더욱 편리하게!**
