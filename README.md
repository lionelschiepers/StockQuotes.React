# Stock Portfolio Tracker
[![Vite](https://img.shields.io/badge/Built%20with-Vite-646CFF)](https://vite.dev/)
[![Auth0](https://img.shields.io/badge/Auth-Auth0-blue)](https://auth0.com/)
[![Azure Functions](https://img.shields.io/badge/Serverless-Azure%20Functions-0078D4)](https://azure.microsoft.com/en-us/services/functions/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-06B6D4)](https://tailwindcss.com/)\
[![GitHub Actions](https://img.shields.io/badge/CI/CD-GitHub%20Actions-2088FF)](https://github.com/features/actions)
[![Build](https://github.com/lionelschiepers/StockQuotes.React/actions/workflows/deploy.yml/badge.svg)](https://github.com/lionelschiepers/StockQuotes.React/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/github/lionelschiepers/StockQuotes.React/graph/badge.svg?token=T7H8JXQ1LQ)](https://codecov.io/github/lionelschiepers/StockQuotes.React)

## Project Overview

This project is a modern, responsive stock portfolio tracking application designed to help you keep a close eye on your investments. Built as a React single-page application with Vite and React Router, it offers a seamless user experience for managing and visualizing your stock holdings.

The application leverages a robust Azure Functions API to fetch real-time stock data directly from Yahoo Finance, ensuring you always have up-to-date information. Secure user authentication is handled via Auth0, providing a safe and personalized environment for your financial data.

Whether you're a seasoned investor or just starting, this tracker provides a clean and intuitive interface to monitor your portfolio's performance.

## Features

- **Real-time Stock Data:** Get instant updates on your stock prices and portfolio value, powered by Yahoo Finance.
- **Personalized Portfolio Management:** Track individual stock holdings and see their performance at a glance.
- **Secure Authentication:** Log in with confidence using Auth0 for secure access to your portfolio.
- **Today at a glance:** The page opens on today's gain or loss in euros, the holdings that drove it, and a band showing every holding sized by its share of the portfolio and shaded by today's move; select a block to open that holding on Yahoo Finance.
- **Gains, dividends and options:** A ledger totals value, cost, gain, realized gain and yearly dividends after tax; each open position links to its option chain with delta and probability-of-profit estimates.
- **Responsive Design:** Access your portfolio from any device, thanks to a mobile-first and responsive user interface.
- **CSV-based Portfolio Loading:** Easily load your portfolio data from a CSV file hosted on GitHub, offering flexibility and easy updates.
- **Dark Mode Support:** Enjoy a comfortable viewing experience with built-in dark mode, powered by Tailwind CSS.

## Technologies Used

### Frontend
- **Vite:** Fast dev server and build tool producing a static single-page application.
- **React Router:** Client-side routing.
- **React:** A JavaScript library for building user interfaces.
- **Tailwind CSS:** A utility-first CSS framework for rapidly building custom designs.
- **Auth0:** For secure and seamless user authentication.

### Backend
- **Azure Functions:** Serverless compute service that enables you to run code without provisioning or managing infrastructure.
- **TypeScript:** A typed superset of JavaScript that compiles to plain JavaScript.
- **`yahoo-finance2`:** A library for fetching financial data from Yahoo Finance.

### Development & Deployment
- **ESLint & Prettier:** For code quality and consistent formatting.
- **Fully Tested:** Comes with a comprehensive test suite using Vitest.
- **GitHub Actions:** For continuous integration and continuous deployment (CI/CD).
- **Automated Docker Builds:** Docker images are automatically built and published to [Docker Hub](https://hub.docker.com/r/lionelschiepers/stockquote-react).
- **Vulnerability Scanning:** Published Docker containers are scanned for security vulnerabilities.

## Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- Node.js (LTS recommended)
- Azure Functions Core Tools (for running the backend API locally)
- Git

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/YOUR_USERNAME/StockQuotes.React.git
    cd StockQuotes.React
    ```

2.  **Configure Environment Variables:**
    Create a `.env` file in the root directory of the project (you can copy `.env.example` as a template) and fill in the necessary environment variables for Auth0 and your API endpoint.

3.  **Install Frontend Dependencies:**
    Navigate to the project root and install the dependencies:
    ```bash
    npm install
    ```

    > **Note:** The Azure Functions backend lives in a separate repository.
    > For local development you can either point `VITE_*_URL` to a
    > deployed instance or run the API locally on `http://localhost:7071`.

### Running the Application

1.  **Start the Frontend Application:**
    Navigate to the project root, and start the Vite development server:
    ```bash
    npm run dev
    ```
    The frontend application will typically run on `http://localhost:3000`.

2.  **Access the Application:**
    Open your web browser and go to `http://localhost:3000`.

## Deployment

The project is configured for continuous deployment using GitHub Actions:
- The frontend is deployed to GitHub Pages.
- The Azure Functions API is deployed to Azure Functions.

## Contributing

We welcome contributions! Please feel free to fork the repository, open issues, and submit pull requests.

---

**Happy Investing!** 📈