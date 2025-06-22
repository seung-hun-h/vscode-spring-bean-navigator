# Changelog

All notable changes to the "vscode-spring-bean-navigator" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.1]

### Added
- Extension icon for better visual identification

## [1.1.0]

### Changed
- Improved CodeLens behavior: CodeLens is no longer displayed when beans cannot be found
- Enhanced user experience by reducing visual clutter from unresolvable dependencies

### Fixed
- Fixed test cases to properly validate CodeLens generation for existing beans
- Improved Java file parsing with proper package and import declarations in tests

## [1.0.0]

### Added
- Spring Bean injection detection for `@Autowired`, constructor, setter, and Lombok annotations
- CodeLens icons at Spring Bean injection points in Java files
- Navigation to bean implementation classes
- Bean resolution and matching system with caching
- Java file parser for syntax analysis and annotation parsing
- Commands for refreshing bean definitions and showing bean count
- Real-time updates on file save and workspace changes

### Technical Features
- Modular architecture with Detector, Provider, and Parser patterns
- Error handling and logging system
- Performance optimization through selective re-analysis