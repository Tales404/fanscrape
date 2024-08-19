# Fantasy Football Data Scraper

This project is a web scraping service designed to retrieve Fantasy Football rankings and related data from FantasyPros. The service uses Playwright to interact with the website and fetch the necessary data, which is then processed and stored for further analysis or integration into Google Sheets.

## Features

- **Automated Web Scraping**: Uses Playwright to automatically navigate the FantasyPros website, select specific experts, and retrieve rankings for different player positions (QB, RB, WR, TE, K, DST).
- **Google Sheets Integration**: The scraped data is seamlessly imported into Google Sheets, allowing for easy access, analysis, and reporting.
- **Customizable and Extensible**: The service is designed to be easily modified for different scraping needs or other data sources.

## Project Structure

- **`main.js`**: The entry point for the Cloud Run service. It sets up the PlaywrightCrawler and processes the data before sending it to Google Sheets.
- **`routes.js`**: Handles the core scraping logic, including navigating the site, selecting experts, and extracting data for different positions.
- **`Google App Script`**: A script that runs in Google Sheets to pull the data from the Cloud Run service and populate the sheets with updated rankings.
- **`cookies.json`**: Stores the necessary cookies to maintain a session with the FantasyPros website.

## Prerequisites

- **Node.js**: Ensure you have Node.js installed on your system.
- **Google Cloud Account**: For deploying the service on Google Cloud Run.
- **GitHub Account**: To host and manage the project repository.

## Setup

1. **Clone the Repository**
    ```bash
    git clone https://github.com/<your-username>/<repository-name>.git
    cd <repository-name>
    ```

2. **Install Dependencies**
    ```bash
    npm install
    ```

3. **Configure Google Cloud**
    - Deploy the service to Google Cloud Run.
    - Set up necessary environment variables and permissions.

4. **Google Sheets Integration**
    - Copy the Google App Script provided in the `GoogleAppScript.md` to your Google Sheets project.
    - Link it with your Cloud Run endpoint to fetch data automatically.

## Usage

- **Running the Scraper Locally**
    ```bash
    npm start
    ```

- **Deploying to Google Cloud Run**
    - Follow the instructions in the `Google Cloud Setup` section to deploy the service.

- **Updating Data in Google Sheets**
    - Open your Google Sheets document and run the script to fetch and populate the latest data.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request for any changes or additions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **FantasyPros**: For providing the data used in this project.
- **Playwright**: For the web automation framework used in this project.
- **Google Cloud**: For hosting the service.
