import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' }
]

interface LanguageSwitcherProps {
  inDropdown?: boolean
  onLanguageChange?: () => void
}

export function LanguageSwitcher({ inDropdown = false, onLanguageChange }: LanguageSwitcherProps) {
  const { i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [currentLang, setCurrentLang] = useState(i18n.language)

  useEffect(() => {
    // Update current language when i18n language changes
    const handleLanguageChanged = (lng: string) => {
      setCurrentLang(lng)
    }

    i18n.on('languageChanged', handleLanguageChanged)

    return () => {
      i18n.off('languageChanged', handleLanguageChanged)
    }
  }, [i18n])

  const handleLanguageChange = async (langCode: string) => {
    // Save to Chrome storage
    await chrome.storage.sync.set({ language: langCode })
    // Change i18n language
    await i18n.changeLanguage(langCode)
    setCurrentLang(langCode)
    setIsOpen(false)
    // Call the callback if provided
    if (onLanguageChange) {
      onLanguageChange()
    }
  }

  const currentLanguage = languages.find(l => l.code === currentLang) || languages[0]

  // Dropdown mode for settings menu
  if (inDropdown) {
    return (
      <div className="py-1">
        <div className="px-4 py-2 text-xs glass-text opacity-60">Language</div>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => handleLanguageChange(lang.code)}
            className={`w-full text-left px-4 py-2 text-sm glass-text hover:bg-white/20 transition-colors flex items-center gap-2 ${
              currentLang === lang.code ? 'bg-white/10' : ''
            }`}
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.name}</span>
            {currentLang === lang.code && (
              <svg className="w-3 h-3 ml-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    )
  }

  // Standalone button mode
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="glass-button flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
        title="Language"
      >
        <span className="text-lg">{currentLanguage.flag}</span>
        <span className="hidden sm:inline">{currentLanguage.name}</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-40 glass-card rounded-lg shadow-lg z-50">
            {languages.map(lang => (
              <button
                key={lang.code}
                onClick={() => handleLanguageChange(lang.code)}
                className={`w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 ${
                  currentLang === lang.code ? 'bg-white/10' : ''
                }`}
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm">{lang.name}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}