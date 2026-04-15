// Injected into the page via chrome.scripting.executeScript — must stay self-contained (no closure over module scope).

export function scrapeJobInfo() {
    const text = (sel, root = document) => {
        try {
            const el = root.querySelector(sel);
            return el ? (el.innerText || el.textContent || '').trim() : '';
        } catch (e) {
            return '';
        }
    };

    const firstMatch = (selectors) => {
        for (const s of selectors) {
            const t = text(s);
            if (t) return t;
        }
        return '';
    };

    let jobData = {
        title: '',
        company: '',
        location: '',
        description: '',
        seniority: '',
        employmentType: '',
        jobFunctions: '',
        industries: '',
        salary: '',
        applicants: '',
        postedDate: '',
        jobId: '',
        url: window.location.href,
        remote: false,
        scrapedAt: new Date().toISOString()
    };

    try {
        console.assert(document.body, 'scrapeJobInfo: expected document.body to exist');

        const cleanText = (value) => String(value || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
        const readMeta = (name) => {
            const meta =
                document.querySelector(`meta[name="${name}"]`) ||
                document.querySelector(`meta[property="${name}"]`) ||
                document.querySelector(`meta[itemprop="${name}"]`);
            return cleanText(meta ? meta.getAttribute('content') : '');
        };
        const textFromNode = (node) => {
            if (!node) return '';
            return cleanText(node.innerText || node.textContent || '');
        };
        const maybeGet = (target, keys) => {
            if (!target) return '';
            for (const key of keys) {
                if (target[key]) return cleanText(target[key]);
            }
            return '';
        };
        const normalizeArray = (value) => (Array.isArray(value) ? value : value ? [value] : []);
        const dedupeLines = (raw, maxChars) => {
            const seen = new Set();
            const kept = [];
            for (const line of String(raw || '').split('\n')) {
                const cleaned = cleanText(line);
                if (!cleaned || seen.has(cleaned)) continue;
                if (/^(apply|save|share|sign in|log in|cookie|privacy|terms)$/i.test(cleaned)) continue;
                seen.add(cleaned);
                kept.push(cleaned);
                if (kept.join('\n').length >= maxChars) break;
            }
            return kept.join('\n').slice(0, maxChars);
        };
        const scoreNode = (node) => {
            const marker = `${node.id || ''} ${(node.className || '').toString()} ${(node.getAttribute('role') || '')}`.toLowerCase();
            let score = 0;
            if (/job|position|vacan|career|opening|description|details|posting/.test(marker)) score += 5;
            if (/main|content|article/.test(marker)) score += 2;
            const sample = textFromNode(node).slice(0, 4000).toLowerCase();
            if (/responsibilit|requirement|qualification|about (the )?role|what you will do|skills/.test(sample)) score += 6;
            if (/apply|posted|salary|benefits|location/.test(sample)) score += 3;
            score += Math.min(8, Math.floor(sample.length / 450));
            return score;
        };
        const pickDescriptionBlocks = () => {
            const selectors = [
                'article',
                'main',
                '[role="main"]',
                'section[id*="job"]',
                'section[class*="job"]',
                'div[id*="job"]',
                'div[class*="job"]',
                'section[id*="position"]',
                'section[class*="position"]',
                'section[id*="description"]',
                'section[class*="description"]',
                'div[id*="description"]',
                'div[class*="description"]'
            ];
            const nodes = Array.from(document.querySelectorAll(selectors.join(',')));
            const ranked = nodes
                .map((node) => ({ node, score: scoreNode(node), raw: textFromNode(node) }))
                .filter((entry) => entry.raw.length >= 200)
                .sort((a, b) => b.score - a.score);

            const picked = [];
            const used = new Set();
            for (const entry of ranked) {
                const trimmed = dedupeLines(entry.raw, 4500);
                if (!trimmed) continue;
                const signature = trimmed.slice(0, 260);
                if (used.has(signature)) continue;
                used.add(signature);
                picked.push(trimmed);
                if (picked.length >= 3) break;
            }
            return picked;
        };
        const findFirstByLabel = (labels) => {
            const all = Array.from(document.querySelectorAll('li, p, div, span, dt, dd')).slice(0, 2500);
            for (const node of all) {
                const content = textFromNode(node);
                if (!content || content.length > 220) continue;
                const lower = content.toLowerCase();
                for (const label of labels) {
                    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const direct = new RegExp(`\\b${escaped}\\b\\s*:?\\s*(.+)`, 'i').exec(content);
                    if (direct && direct[1]) return cleanText(direct[1]);
                    if (lower === label.toLowerCase() || lower.startsWith(label.toLowerCase() + ':')) {
                        const sibling = node.nextElementSibling;
                        const siblingText = textFromNode(sibling);
                        if (siblingText) return siblingText;
                    }
                }
            }
            return '';
        };
        const getTimeText = () => {
            const timeEl = document.querySelector('time');
            if (!timeEl) return '';
            return cleanText(timeEl.getAttribute('datetime') || timeEl.innerText || '');
        };

        const ldScripts = Array.from(document.querySelectorAll('script[type="application/ld+json"]'));
        let ld = null;
        for (const s of ldScripts) {
            try {
                const parsed = JSON.parse(s.innerText || 'null');
                const stack = normalizeArray(parsed);
                while (stack.length) {
                    const item = stack.pop();
                    if (!item || typeof item !== 'object') continue;
                    const t = item['@type'];
                    if ((typeof t === 'string' && /JobPosting|Job/i.test(t)) || (Array.isArray(t) && t.some((x) => /JobPosting|Job/i.test(String(x))))) {
                        ld = item;
                        break;
                    }
                    if (Array.isArray(item['@graph'])) stack.push(...item['@graph']);
                    for (const value of Object.values(item)) {
                        if (value && typeof value === 'object') stack.push(value);
                    }
                }
                if (ld) break;
            } catch (e) {
                // ignore JSON parse errors
            }
        }

        if (ld) {
            jobData.title = maybeGet(ld, ['title', 'name', 'headline']) || jobData.title;
            const org = ld.hiringOrganization || ld.organization || ld.employer;
            jobData.company = maybeGet(org, ['name', 'legalName']) || jobData.company;
            jobData.description = maybeGet(ld, ['description']) || jobData.description;
            jobData.postedDate = maybeGet(ld, ['datePosted', 'validFrom']) || jobData.postedDate;
            const empType = ld.employmentType;
            if (empType) {
                jobData.employmentType = Array.isArray(empType) ? empType.join(', ') : String(empType);
            }
            if (ld.baseSalary || ld.salary) {
                try {
                    const salaryLike = ld.baseSalary || ld.salary;
                    jobData.salary = typeof salaryLike === 'string' ? salaryLike : JSON.stringify(salaryLike);
                } catch (e) {
                    jobData.salary = String(ld.baseSalary || ld.salary);
                }
            }
            if (ld.jobLocation || ld.applicantLocationRequirements) {
                try {
                    const locations = normalizeArray(ld.jobLocation).concat(normalizeArray(ld.applicantLocationRequirements));
                    jobData.location =
                        locations
                            .map((item) => {
                                const address = item && item.address ? item.address : item;
                                return [address && address.addressLocality, address && address.addressRegion, address && address.addressCountry]
                                    .filter(Boolean)
                                    .join(', ');
                            })
                            .filter(Boolean)
                            .join(' | ') || jobData.location;
                } catch (e) {
                    // ignore
                }
            }
        }

        jobData.title =
            jobData.title ||
            firstMatch([
                'h1[itemprop="title"]',
                '[data-testid*="job-title"]',
                '[class*="job-title"]',
                '[id*="job-title"]',
                'h1'
            ]) ||
            cleanText(document.title).replace(/\s*[|\-•].*$/, '');
        jobData.company =
            jobData.company ||
            firstMatch([
                '[itemprop="hiringOrganization"] [itemprop="name"]',
                '[data-testid*="company"]',
                '[class*="company"] a',
                '[class*="employer"] a',
                '[id*="company"]'
            ]) ||
            readMeta('og:site_name');
        jobData.location =
            jobData.location ||
            firstMatch([
                '[itemprop="jobLocation"]',
                '[class*="location"]',
                '[data-testid*="location"]',
                '[id*="location"]'
            ]) ||
            findFirstByLabel(['location', 'job location', 'where']);

        const descriptionBlocks = pickDescriptionBlocks();
        const combinedDescription = dedupeLines(descriptionBlocks.join('\n\n'), 12000);
        const fallbackDescription = dedupeLines(textFromNode(document.body), 5000);
        jobData.description = jobData.description || combinedDescription || fallbackDescription;

        const idFromPath = window.location.pathname.match(/(?:job|jobs|position|posting|career|vacancy)[/-](\d{4,})/i);
        const idFromSearch = window.location.search.match(/(?:job|posting|position)(?:id|Id|ID)=([a-zA-Z0-9_-]+)/);
        const dataJobEl = document.querySelector('[data-job-id], [data-jobid], [data-position-id]');
        jobData.jobId =
            jobData.jobId ||
            (idFromPath && idFromPath[1]) ||
            (idFromSearch && idFromSearch[1]) ||
            (dataJobEl && (dataJobEl.getAttribute('data-job-id') || dataJobEl.getAttribute('data-jobid') || dataJobEl.getAttribute('data-position-id'))) ||
            '';

        jobData.postedDate =
            jobData.postedDate ||
            getTimeText() ||
            findFirstByLabel(['posted', 'date posted', 'posted on', 'publication date', 'date']);
        jobData.applicants =
            jobData.applicants || findFirstByLabel(['applicants', 'applications', 'number of applicants']);
        jobData.salary =
            jobData.salary ||
            firstMatch(['[class*="salary"]', '[data-testid*="salary"]', '[id*="salary"]']) ||
            findFirstByLabel(['salary', 'compensation', 'pay', 'annual salary']);

        jobData.seniority = jobData.seniority || findFirstByLabel(['seniority', 'experience level', 'level']);
        jobData.employmentType = jobData.employmentType || findFirstByLabel(['employment type', 'job type', 'schedule']);
        jobData.jobFunctions = jobData.jobFunctions || findFirstByLabel(['job function', 'team', 'department']);
        jobData.industries = jobData.industries || findFirstByLabel(['industry', 'industries', 'sector']);

        jobData.remote = /remote/i.test(jobData.location + ' ' + jobData.description);
    } catch (err) {
        console.error('scrapeJobInfo error:', err);
    }

    jobData.scrapedAt = new Date().toISOString();
    jobData.url = window.location.href;
    return jobData;
}
