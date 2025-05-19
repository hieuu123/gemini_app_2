import requests
from bs4 import BeautifulSoup
from requests.exceptions import RequestException
import re
# import config


def get_job_ids(keyword):
    """
    Trả về danh sách job_id (list of str) tìm được cho từ khóa keyword
    """
    base_url = config.LINKEDIN_BASE_URL
    params = { **config.LINKEDIN_DEFAULT_PARAMS, 'keywords': keyword }
    job_ids = set()

    try:
        resp = requests.get(
            base_url,
            params=params,
            headers=config.REQUEST_HEADERS,
            timeout=10
        )
        resp.raise_for_status()
    except RequestException:
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')
    cards = soup.find_all(
        'div',
        class_='base-card relative w-full hover:no-underline '
               'focus:no-underline base-card--link '
               'base-search-card base-search-card--link job-search-card'
    )
    for card in cards:
        urn = card.get('data-entity-urn', '')
        if urn and 'jobPosting' in urn:
            job_ids.add(urn.split(':')[-1])

    return list(job_ids)


def get_job_details(job_id, cancel_event):
    """
    Trả về dict chi tiết job từ LinkedIn cho job_id, hoặc None nếu không tìm thấy
    """
    if cancel_event.is_set():
        return None

    url = f"{config.LINKEDIN_JOB_VIEW_URL}{job_id}"
    try:
        resp = requests.get(
            url,
            headers=config.REQUEST_HEADERS,
            timeout=10
        )
        resp.raise_for_status()
    except RequestException:
        return None

    soup = BeautifulSoup(resp.text, 'html.parser')
    # Kiểm tra xem job đã đóng chưa
    if soup.find(class_='closed-job'):
        return {'job_id': job_id, 'is_closed': True}
    details = {}

    # # Title
    # title_el = soup.find('h1', class_='top-card-layout__title')
    # details['title'] = title_el.get_text(strip=True) if title_el else None
    # if not details['title']:
    #     return None
    
    # Title
    title_el = soup.find('h1', class_='top-card-layout__title')
    if not title_el:
        return None
    details['title'] = title_el.get_text(strip=True)

    # URL
    details['url'] = url

    # Company
    comp_el = soup.find('a', class_='topcard__org-name-link')
    details['company_name'] = comp_el.get_text(strip=True) if comp_el else None

    # Posted time
    posted_el = soup.find('span', class_='posted-time-ago__text')
    details['posted_time'] = posted_el.get_text(strip=True) if posted_el else None

    # Number of applicants
    applicants_el = soup.find(['span', 'figcaption'], class_='num-applicants__caption')
    if applicants_el:
        m = re.search(r'\d+', applicants_el.get_text(strip=True))
        details['num_applicants'] = m.group(0) if m else None
    else:
        details['num_applicants'] = None

    # Criteria fields
    criteria = soup.find_all('span', class_='description__job-criteria-text')
    fields = ['seniority_level', 'employment_type', 'job_function', 'industries']
    for idx, field in enumerate(fields):
        details[field] = (
            criteria[idx].get_text(strip=True)
            if len(criteria) > idx else None
        )

    # Location
    loc_el = soup.find('span', class_='topcard__flavor--bullet')
    details['place'] = loc_el.get_text(strip=True) if loc_el else None

    # Description
    desc_el = soup.find('div', class_='show-more-less-html__markup')
    details['job_description'] = str(desc_el) if desc_el else None

    return details
