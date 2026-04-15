import { scrapeJobInfo } from '../scrape-job-info.js';
import { initProfileUI } from '../profile.js';
import { initDownloadListeners } from '../downloads.js' ;
import { initPreviewTabs, initCopyPreview, initEditModal } from '../preview-ui.js'; 
import { initScrapeGeneration } from '../generation.js';

initProfileUI();
initScrapeGeneration(scrapeJobInfo);
initDownloadListeners();
initPreviewTabs();
initCopyPreview();
initEditModal();
