# hCaptcha Image Scraper

This is a Node.js script that uses Puppeteer and the hCaptcha library to collect images from a captcha challenge on the hCaptcha demo page. The purpose of this script is to generate a dataset of captcha images and prompts that can be used for training machine learning models.

Installation
Clone this repository to your local machine and install the dependencies:

```bash
git clone https://github.com/your-username/hcaptcha-image-scraper.git
npm install
```

Run the script using Node.js, specifying the number of images to collect as a command-line argument:
```bash
node main.js <number-of-images>
```
For example, to collect 90 images, run:

```bash
node main.js 10
```

The script will open the hCaptcha demo page in a headless Chrome browser and start collecting images from the captcha challenge. 
The images and prompts will be saved to the images directory.

Once the script has finished running, you can use the images and prompts to train machine learning models.
