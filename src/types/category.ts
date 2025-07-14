export interface Category {
  id: string
  name: string
  color: chrome.tabGroups.ColorEnum
  domains: string[]
  keywords: string[]
  isDefault: boolean
  createdAt: number
}

export interface CategoryMapping {
  [domain: string]: string // domain -> categoryId
}

export const DEFAULT_CATEGORIES: Category[] = [
  {
    id: "work",
    name: "Work",
    color: "blue",
    domains: ["github.com", "gitlab.com", "stackoverflow.com", "localhost", "vercel.app", "netlify.app"],
    keywords: ["dev", "code", "api"],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: "social",
    name: "Social",
    color: "pink",
    domains: ["twitter.com", "x.com", "facebook.com", "instagram.com", "linkedin.com", "discord.com"],
    keywords: ["social", "chat", "message"],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: "entertainment",
    name: "Entertainment",
    color: "red",
    domains: ["youtube.com", "netflix.com", "twitch.tv", "spotify.com"],
    keywords: ["video", "watch", "stream", "music"],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: "shopping",
    name: "Shopping",
    color: "yellow",
    domains: ["amazon.com", "ebay.com", "aliexpress.com", "shopify.com"],
    keywords: ["shop", "store", "buy", "cart"],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: "news",
    name: "News",
    color: "green",
    domains: ["cnn.com", "bbc.com", "reddit.com", "hackernews.com"],
    keywords: ["news", "blog", "article"],
    isDefault: true,
    createdAt: Date.now()
  },
  {
    id: "other",
    name: "Other",
    color: "grey",
    domains: [],
    keywords: [],
    isDefault: true,
    createdAt: Date.now()
  }
]