// API Configuration
const API_KEY =  '5ddae5165fd247d8985e36be1a85f821'; // Replace with your actual NewsAPI key
let currentCategory = 'general';
let currentPage = 1;
let isSearching = false;
let currentSearchQuery = '';
let isLoadingMore = false;
let allArticlesLoaded = false;
let darkMode = localStorage.getItem('darkMode') === 'true';

// DOM Elements
const categoryFilter = document.getElementById('categoryFilter');
const newsGrid = document.getElementById('newsGrid');
const loadingSkeleton = document.getElementById('loadingSkeleton');
const errorMessage = document.getElementById('errorMessage');
const themeToggle = document.getElementById('themeToggle');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const searchResultsInfo = document.getElementById('searchResultsInfo');
const endOfResults = document.getElementById('endOfResults');

// Initialize the app
function initApp() {
  // Set theme
  document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
  
  // Load saved category from localStorage
  const savedCategory = localStorage.getItem('newsCategory');
  if (savedCategory) {
    currentCategory = savedCategory;
    document.querySelector(`button[data-category="${savedCategory}"]`).classList.add('active');
  }
  
  // Load initial news
  fetchNews(currentCategory);
  
  // Set up event listeners
  setupEventListeners();
}

// Set up event listeners
function setupEventListeners() {
  // Category filter
  categoryFilter.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON' || e.target.parentElement.tagName === 'BUTTON') {
      const button = e.target.tagName === 'BUTTON' ? e.target : e.target.parentElement;
      const category = button.dataset.category;
      
      if (category !== currentCategory) {
        // Reset search state if active
        if (isSearching) {
          isSearching = false;
          currentSearchQuery = '';
          searchInput.value = '';
          searchResultsInfo.textContent = '';
        }
        
        // Update UI
        document.querySelector('.category-filter button.active').classList.remove('active');
        button.classList.add('active');
        
        // Update state and fetch news
        currentCategory = category;
        currentPage = 1;
        allArticlesLoaded = false;
        localStorage.setItem('newsCategory', category);
        fetchNews(category);
      }
    }
  });
  
  // Theme toggle
  themeToggle.addEventListener('click', () => {
    darkMode = !darkMode;
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    themeToggle.innerHTML = darkMode ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    localStorage.setItem('darkMode', darkMode);
  });
  
  // Search functionality
  searchBtn.addEventListener('click', executeSearch);
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') executeSearch();
  });
  
  // Infinite scroll
  window.addEventListener('scroll', handleScroll);
}

// Show loading skeleton
function showLoadingSkeleton() {
  loadingSkeleton.innerHTML = '';
  errorMessage.style.display = 'none';
  endOfResults.style.display = 'none';
  
  // Create 6 skeleton items
  for (let i = 0; i < 6; i++) {
    loadingSkeleton.innerHTML += `
      <div class="skeleton-item">
        <div class="skeleton-image"></div>
        <div class="skeleton-content">
          <div class="skeleton-line"></div>
          <div class="skeleton-line medium"></div>
          <div class="skeleton-line short"></div>
        </div>
      </div>
    `;
  }
  
  loadingSkeleton.style.display = 'grid';
}

// Hide loading skeleton
function hideLoadingSkeleton() {
  loadingSkeleton.style.display = 'none';
}

// Show error message
function showError(message) {
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  hideLoadingSkeleton();
}

// Fetch news from API
async function fetchNews(category, page = 1) {
  try {
    if (page === 1) {
      showLoadingSkeleton();
      currentPage = 1;
      allArticlesLoaded = false;
    } else {
      if (isLoadingMore || allArticlesLoaded) return;
      isLoadingMore = true;
      newsGrid.insertAdjacentHTML('beforeend', '<div class="loading-more" id="loadingMore">Loading more news...</div>');
    }
    
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=us&category=${category}&page=${page}&pageSize=12&apiKey=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('Failed to fetch news');
    
    const data = await response.json();
    
    if (page === 1) {
      displayNews(data.articles);
    } else {
      document.getElementById('loadingMore')?.remove();
      if (data.articles.length > 0) {
        newsGrid.insertAdjacentHTML('beforeend', data.articles.map(article => createNewsCard(article)).join(''));
      } else {
        allArticlesLoaded = true;
        endOfResults.textContent = "You've reached the end of available articles.";
        endOfResults.style.display = 'block';
      }
    }
    
    // NewsAPI has a limit of 100 results
    if (data.totalResults <= currentPage * 12) {
      allArticlesLoaded = true;
      if (page > 1) {
        endOfResults.textContent = "You've reached the end of available articles.";
        endOfResults.style.display = 'block';
      }
    }
  } catch (error) {
    console.error('Error:', error);
    showError(error.message);
  } finally {
    hideLoadingSkeleton();
    isLoadingMore = false;
  }
}

// Display news articles
function displayNews(articles) {
  hideLoadingSkeleton();
  isSearching = false;
  searchInput.value = '';
  searchResultsInfo.textContent = '';
  
  if (!articles || articles.length === 0) {
    showError('No news articles found for this category.');
    return;
  }
  
  newsGrid.innerHTML = articles.map(article => createNewsCard(article)).join('');
}

// Create news card HTML
function createNewsCard(article) {
  return `
    <div class="news-card">
      <img 
        src="${article.urlToImage || 'https://via.placeholder.com/300x200?text=No+Image'}" 
        alt="${article.title}" 
        class="news-image"
        onerror="this.src='https://via.placeholder.com/300x200?text=Image+Not+Available'"
      >
      <div class="news-content">
        <h3 class="news-title">${article.title}</h3>
        <p class="news-description">${article.description || 'No description available.'}</p>
        <div class="news-footer">
          <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="read-more">
            Read more <i class="fas fa-arrow-right"></i>
          </a>
          <p class="news-source">
            <i class="fas fa-newspaper"></i> ${article.source?.name || 'Unknown source'}
          </p>
        </div>
      </div>
    </div>
  `;
}

// Search functionality
function executeSearch() {
  const query = searchInput.value.trim();
  if (query && query !== currentSearchQuery) {
    currentSearchQuery = query;
    isSearching = true;
    currentPage = 1;
    allArticlesLoaded = false;
    fetchSearchResults(query);
  } else if (!query && isSearching) {
    // Return to normal view if search is empty
    isSearching = false;
    currentSearchQuery = '';
    searchResultsInfo.textContent = '';
    fetchNews(currentCategory);
  }
}

async function fetchSearchResults(query, page = 1) {
  try {
    if (page === 1) {
      showLoadingSkeleton();
      searchResultsInfo.textContent = `Searching for "${query}"...`;
    } else {
      if (isLoadingMore || allArticlesLoaded) return;
      isLoadingMore = true;
      newsGrid.insertAdjacentHTML('beforeend', '<div class="loading-more" id="loadingMore">Loading more results...</div>');
    }
    
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=popularity&page=${page}&pageSize=12&apiKey=${API_KEY}`
    );
    
    if (!response.ok) throw new Error('Search failed');
    
    const data = await response.json();
    
    if (page === 1) {
      displaySearchResults(data.articles, query);
    } else {
      document.getElementById('loadingMore')?.remove();
      if (data.articles.length > 0) {
        newsGrid.insertAdjacentHTML('beforeend', data.articles.map(article => createNewsCard(article)).join(''));
      } else {
        allArticlesLoaded = true;
        endOfResults.textContent = "No more results found.";
        endOfResults.style.display = 'block';
      }
    }
    
    if (data.totalResults <= currentPage * 12) {
      allArticlesLoaded = true;
      if (page > 1) {
        endOfResults.textContent = "No more results found.";
        endOfResults.style.display = 'block';
      }
    }
  } catch (error) {
    showError("Failed to complete search. Please try again.");
    searchResultsInfo.textContent = '';
  } finally {
    if (page === 1) hideLoadingSkeleton();
    isLoadingMore = false;
  }
}

function displaySearchResults(articles, query) {
  hideLoadingSkeleton();
  
  if (!articles || articles.length === 0) {
    newsGrid.innerHTML = `<p class="no-results">No results found for "${query}"</p>`;
    searchResultsInfo.textContent = `No results for "${query}"`;
    return;
  }
  
  newsGrid.innerHTML = articles.map(article => createNewsCard(article)).join('');
  searchResultsInfo.textContent = `Showing ${articles.length} results for "${query}"`;
}

// Infinite scroll handler
function handleScroll() {
  if (isLoadingMore || allArticlesLoaded) return;
  
  // Load more when user scrolls to 80% of page
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight * 0.8) {
    currentPage++;
    if (isSearching) {
      fetchSearchResults(currentSearchQuery, currentPage);
    } else {
      fetchNews(currentCategory, currentPage);
    }
  }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);