# Spring Bean Navigator

A VSCode Extension for Spring Framework developers. It detects various Spring Bean injection patterns in Java files and helps you easily navigate to the corresponding Bean implementations.

## Key Features

### Bean Injection Detection
- **@Autowired Field Injection**: Automatically detects fields annotated with `@Autowired`
- **Constructor Injection**: Detects Bean injection based on constructor parameter types
- **Setter Injection**: Detects Setter methods annotated with `@Autowired`
- **Method Injection**: Detects Bean method parameters in `@Configuration` classes
- **Lombok Injection**: Supports injection based on `@RequiredArgsConstructor` and `@AllArgsConstructor`

### Spring Bean Recognition
- Supports `@Service`, `@Component`, `@Repository`, `@Controller`, `@RestController`, `@Configuration`, `@Bean` annotations
- Automatic interface implementation matching
- Multiple Bean candidate selection UI

### Convenient Navigation
- **CodeLens Display**: Shows "Go to Bean" links at Bean injection points
- **One-click Navigation**: Click to instantly navigate to Bean implementation classes
- **Multiple Candidate Handling**: Provides selection UI when multiple implementations exist

## Supported Injection Patterns

### 1. Field Injection
```java
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}
```

### 2. Constructor Injection
```java
@Service
public class UserService {
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

### 3. Lombok Constructor Injection
```java
@Service
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
}
```

### 4. Setter Injection
```java
@Service
public class UserService {
    private UserRepository userRepository;
    
    @Autowired
    public void setUserRepository(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}
```

### 5. Method Injection (@Bean Methods)
```java
@Configuration
public class AppConfig {
    
    @Bean
    public UserService userService(UserRepository userRepository, EmailService emailService) {
        return new UserService(userRepository, emailService);
    }
    
    @Bean
    public OrderProcessor orderProcessor(PaymentService paymentService) {
        return new OrderProcessor(paymentService);
    }
}
```

## How to Use

1. **Open Java File**: Open a Java file with Spring Bean injections
2. **Check CodeLens**: "→ Go to Bean" links will be displayed at Bean injection points
3. **Click to Navigate**: Click the link to navigate to the corresponding Bean implementation
4. **Select Multiple Candidates**: If multiple implementations exist, a selection UI will appear

## Commands

- `Spring Bean Navigator: Refresh Spring Bean Definitions` - Refresh Bean definitions
- `Spring Bean Navigator: Show Bean Count` - Display the number of discovered Beans

## System Requirements

- **Visual Studio Code**: 1.90.0 or higher
- **Supported Languages**: Java (*.java)
- **Spring Framework**: 3.0 or higher

## Development Status

### Completed Features
- [x] @Autowired field injection detection
- [x] Constructor injection detection
- [x] Setter injection detection
- [x] Method injection (@Bean method parameters)
- [x] Lombok annotation support
- [x] CodeLens UI implementation
- [x] Bean navigation functionality
- [x] Multiple Bean candidate selection

### Features in Development
- [ ] Kotlin support
- [ ] Bean dependency graph visualization
- [ ] Bean search functionality

## Known Issues

- Currently only supports Java files (Kotlin support planned for future)
- Detection may be limited for very complex Bean dependencies

---