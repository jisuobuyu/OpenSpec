## ADDED Requirements

### Requirement: User can toggle between light and dark theme
The system SHALL allow users to switch between light and dark themes via a toggle button.

#### Scenario: Toggle to dark mode
- **WHEN** user clicks the theme toggle button in light mode
- **THEN** the UI switches to dark color scheme
- **AND** the preference is saved to localStorage

#### Scenario: Toggle to light mode
- **WHEN** user clicks the theme toggle button in dark mode
- **THEN** the UI switches to light color scheme

### Requirement: Theme preference persists across sessions
The system SHALL restore the user's theme preference on page load.

#### Scenario: Restore dark mode on reload
- **WHEN** user has previously selected dark mode and reloads the page
- **THEN** the UI renders in dark mode
