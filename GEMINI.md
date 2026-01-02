# Project Overview

This is a stock portfolio tracking application. It is built with Next.js and uses an Azure Functions API to fetch stock data from Yahoo Finance. The application uses Auth0 for user authentication.

The frontend is a Next.js application that displays the user's stock portfolio. The portfolio data is loaded from a CSV file hosted on GitHub. The application then enriches this data with real-time stock information fetched from the Azure Functions API.

The backend is an Azure Functions API written in TypeScript. It uses the `yahoo-finance2` library to fetch stock data from Yahoo Finance.

The project also contains a Blazor application, but it does not seem to be integrated with the Next.js application.

# Building and Running

## Frontend

To build and run the frontend application, you will need to have Node.js installed.

1.  Navigate to the root directory of the project.
2.  Install the dependencies: `npm install`
3.  Run the development server: `npm run dev`
4.  Open your browser and navigate to `http://localhost:3000`.

## Backend

To build and run the backend API, you will need to have Node.js and the Azure Functions Core Tools installed.

1.  Navigate to the `api` directory.
2.  Install the dependencies: `npm install`
3.  Run the API: `npm start`

# Development Conventions

*   The frontend is written in JavaScript and uses the Next.js framework.
*   The backend is written in TypeScript and uses the Azure Functions framework.
*   The project uses ESLint for linting. You can run the linter with `npm run lint`.
*   The project uses Prettier for code formatting.
*   The project uses GitHub Actions for continuous integration and deployment.
*   The frontend is deployed to GitHub Pages.
*   The API is deployed to Azure Functions.

# Rules
- The project is scanned with sonarqube
- The application is developped on windows os
- Validate every fix with npm run lint
- Validate every fix with npm run format
- Validate every fix with npm run build
- Validate every fix with npm test
- don't execute 'npm run dev' for testing
- don't automatically update git
- dark mode is managed by tailwindcss (using @custom-variant dark in global.css)
- SonarQube advise: Don't use a zero fraction in the number
- SonarQube advise: prefer globalThis instead of window
- SonarQube advise: prefer globalThis instead of global
