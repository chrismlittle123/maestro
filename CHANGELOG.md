# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2024-12-16

### Added

- Initial release of Maestro framework
- **@maestro/core**: Core orchestration engine
  - Workflow YAML parser with Zod validation
  - Agent markdown parser with frontmatter support
  - In-memory event bus with 9 event types
  - File system artifact storage
  - Workflow engine for single-step execution
  - Manifest generation for run tracking
- **@maestro/sdk**: Public SDK for integrations
  - Maestro class with workflow execution API
  - Event subscription system
  - Mock executor for testing
  - Claude Code executor adapter
- **maestro-cli**: Command-line interface
  - `maestro init` - Initialize new projects
  - `maestro run` - Execute workflows
  - `maestro status` - View run status
  - `--dry-run` mode for workflow preview
- Comprehensive test suite (166 tests)
  - Unit tests for core components
  - E2E tests for CLI commands
  - Test fixtures for workflow scenarios
- Documentation
  - CLAUDE.md for AI assistant guidance
  - Detailed roadmap through v3.0.0
  - Example workflows and agent personas
