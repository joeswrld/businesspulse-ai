// Structured data generators for different page types

export const generateOrganizationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "NoteX",
  legalName: "NoteX AI Feedback Platform",
  url: "https://notex.com.ng",
  logo: "https://notex.com.ng/favicon-32x32.png",
  foundingDate: "2024",
  description: "AI-powered feedback analytics platform that helps businesses transform customer feedback into actionable insights.",
  address: {
    "@type": "PostalAddress",
    addressCountry: "NG",
  },
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "Customer Support",
    email: "support@notex.com.ng",
  },
  sameAs: [
    "https://www.producthunt.com/products/notex-turn-feedback-into-growth",
    "https://twitter.com/notex_ai",
  ],
});

export const generateWebsiteSchema = () => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "NoteX",
  url: "https://notex.com.ng",
  description: "AI-powered feedback analytics platform for businesses",
  potentialAction: {
    "@type": "SearchAction",
    target: "https://notex.com.ng/search?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
});

export const generateSoftwareApplicationSchema = () => ({
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NoteX",
  operatingSystem: "Web Browser",
  applicationCategory: "BusinessApplication",
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.9",
    ratingCount: "500",
  },
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    priceValidUntil: "2025-12-31",
    availability: "https://schema.org/InStock",
  },
  description: "Transform customer feedback into actionable insights with AI-powered analytics. Real-time sentiment analysis, automated reporting, and intelligent insights.",
  featureList: [
    "AI-Powered Sentiment Analysis",
    "Real-time Feedback Analytics",
    "Automated Report Generation",
    "Custom Survey Builder",
    "Team Collaboration Tools",
    "Advanced Data Visualization",
  ],
});

export const generateProductSchema = (plan: {
  name: string;
  price: string;
  description: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Product",
  name: `NoteX ${plan.name} Plan`,
  description: plan.description,
  brand: {
    "@type": "Brand",
    name: "NoteX",
  },
  offers: {
    "@type": "Offer",
    price: plan.price,
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
    url: "https://notex.com.ng/signup",
  },
});

export const generateFAQSchema = (faqs: { question: string; answer: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.answer,
    },
  })),
});

export const generateBreadcrumbSchema = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: `https://notex.com.ng${item.url}`,
  })),
});

export const generateArticleSchema = (article: {
  title: string;
  description: string;
  author: string;
  publishedDate: string;
  modifiedDate?: string;
  image?: string;
  url: string;
}) => ({
  "@context": "https://schema.org",
  "@type": "Article",
  headline: article.title,
  description: article.description,
  author: {
    "@type": "Person",
    name: article.author,
  },
  datePublished: article.publishedDate,
  dateModified: article.modifiedDate || article.publishedDate,
  image: article.image || "https://notex.com.ng/favicon-32x32.png",
  url: `https://notex.com.ng${article.url}`,
  publisher: {
    "@type": "Organization",
    name: "NoteX",
    logo: {
      "@type": "ImageObject",
      url: "https://notex.com.ng/favicon-32x32.png",
    },
  },
});
