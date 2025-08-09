document.getElementById("scrapeBtn").addEventListener("click", async () => {
    let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Run scrapeJobInfo in the page
    chrome.scripting.executeScript({
        target: { tabId: tab.id },
        function: scrapeJobInfo
    }, (injectionResults) => {
        if (injectionResults && injectionResults[0].result) {
            let textContent = injectionResults[0].result;

            // Save file using Chrome downloads API
            chrome.downloads.download({
                url: URL.createObjectURL(new Blob([textContent], { type: 'text/plain' })),
                filename: `job_${Date.now()}.txt`
            });

            document.getElementById("status").innerText = "Job info saved!";
        } else {
            document.getElementById("status").innerText = "No data found.";
        }
    });
});

// Function definition needs to be here so it can be injected
function scrapeJobInfo() {
    let jobData = {
        title: "",
        company: "",
        location: "",
        description: "",
        url: window.location.href,
        scrapedAt: new Date().toISOString()
    };

    const host = window.location.hostname;

    if (host.includes("linkedin.com")) {
        jobData.title = document.querySelector(".top-card-layout__title")?.innerText || "";
        jobData.company = document.querySelector(".topcard__org-name-link")?.innerText || "";
        jobData.location = document.querySelector(".topcard__flavor--bullet")?.innerText || "";
        jobData.description = document.querySelector(".description__text")?.innerText || "";
    } 
    else if (host.includes("indeed.com")) {
        jobData.title = document.querySelector("h1.jobsearch-JobInfoHeader-title")?.innerText || "";
        jobData.company = document.querySelector(".jobsearch-InlineCompanyRating div:first-child")?.innerText || "";
        jobData.location = document.querySelector(".jobsearch-InlineCompanyRating div:nth-child(2)")?.innerText || "";
        jobData.description = document.querySelector("#jobDescriptionText")?.innerText || "";
    }
    else if (host.includes("glassdoor.com")) {
        jobData.title = document.querySelector("div[data-test='job-title']")?.innerText || "";
        jobData.company = document.querySelector("div[data-test='employerName']")?.innerText || "";
        jobData.location = document.querySelector("div[data-test='location']")?.innerText || "";
        jobData.description = document.querySelector("div.jobDescriptionContent")?.innerText || "";
    } 
    else {
        jobData.title = document.querySelector("h1")?.innerText || "";
        jobData.description = document.body.innerText.slice(0, 2000) + "...";
    }

    return `
Job Title: ${jobData.title}
Company: ${jobData.company}
Location: ${jobData.location}
URL: ${jobData.url}
Scraped At: ${jobData.scrapedAt}

Description:
${jobData.description}
`;
}
