import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import IndexPopup from './popup-component'
import enTranslations from '../locales/en.json'
import koTranslations from '../locales/ko.json'
import jaTranslations from '../locales/ja.json'

// Get saved language from storage
async function getSavedLanguage(): Promise<string> {
  try {
    const result = await chrome.storage.sync.get('language')
    if (result.language) {
      return result.language
    }
  } catch {
    // Chrome storage not available
  }

  // Fallback to browser language if available
  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.split('-')[0]
    if (['en', 'ko', 'ja'].includes(browserLang)) {
      return browserLang
    }
  }

  return 'en' // Default fallback
}

// Initialize i18n with the saved language
let isInitialized = false

async function ensureI18nInitialized() {
  if (!isInitialized) {
    const savedLang = await getSavedLanguage()

    await i18n
      .use(initReactI18next)
      .init({
        resources: {
          en: { translation: enTranslations },
          ko: { translation: koTranslations },
          ja: { translation: jaTranslations }
        },
        lng: savedLang,
        fallbackLng: 'en',
        debug: false,
        interpolation: {
          escapeValue: false
        }
      })

    isInitialized = true
  }
}

// Main Popup component that handles i18n initialization
function Popup() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ensureI18nInitialized().then(() => {
      setReady(true)
    })

    // Listen for language changes from storage
    const storageListener = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.language && changes.language.newValue) {
        // Update i18n language when storage changes
        i18n.changeLanguage(changes.language.newValue)
      }
    }

    chrome.storage.onChanged.addListener(storageListener)

    return () => {
      chrome.storage.onChanged.removeListener(storageListener)
    }
  }, [])

  if (!ready) {
    return (
      <div className="w-[400px] min-h-[500px] flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    )
  }

  return (
    <I18nextProvider i18n={i18n}>
      <IndexPopup />
    </I18nextProvider>
  )
}

// WXT expects a main function for popup entrypoints
export default {
  async main() {
    // Ensure i18n is initialized before rendering
    await ensureI18nInitialized()

    // Find or create the root element
    const rootElement = document.getElementById('root') || document.body

    // Create React root and render the app
    const root = ReactDOM.createRoot(rootElement)
    root.render(
      <I18nextProvider i18n={i18n}>
        <Popup />
      </I18nextProvider>
    )
  }
}