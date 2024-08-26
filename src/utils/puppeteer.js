const puppeteer = require("puppeteer");

exports.generatePDF = async (HTML, fileName) => {
  // Launch a new browser instance
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Define your HTML content

  // Set the HTML content to the page
  await page.setContent(HTML);

  // Generate the PDF
  await page.pdf({
    path: `./src/uploads/${fileName}.pdf`, // Specify the file name and path
    format: "A4", // Format of the PDF
    printBackground: true, // Ensure the background colors and images are printed
  });

  // Close the browser instance
  await browser.close();
};
