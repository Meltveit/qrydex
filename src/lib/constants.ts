// Channel categories and tags (Reddit-style)
export const CHANNEL_CATEGORIES = [
    {
        name: 'Anime & Cosplay',
        tags: ['Anime', 'Manga', 'Cosplay', 'J-Pop', 'K-Pop', 'Vtubers', 'Fan Art', 'Light Novels'],
    },
    {
        name: 'Art & Hobbies',
        tags: ['Digital Art', 'Photography', 'Drawing', 'Crafts', 'DIY', '3D Modeling', 'Music Production', 'Writing', 'Painting', 'Sculpting'],
    },
    {
        name: 'Business & Finance',
        tags: ['Investing', 'Crypto', 'Stocks', 'Startups', 'Entrepreneurship', 'Personal Finance', 'Real Estate', 'Trading', 'Economics'],
    },
    {
        name: 'Education & Learning',
        tags: ['AI Learning', 'Programming', 'Languages', 'Science', 'Math', 'History', 'Online Courses', 'Study Tips', 'Research'],
    },
    {
        name: 'Entertainment',
        tags: ['Movies', 'TV Shows', 'Streaming', 'Celebrities', 'Memes', 'Podcasts', 'Comedy', 'Gaming News'],
    },
    {
        name: 'Gaming',
        tags: ['PC Gaming', 'Console', 'Mobile Games', 'Esports', 'Game Dev', 'Retro Gaming', 'VR Gaming', 'MMOs', 'FPS', 'RPGs', 'Strategy'],
    },
    {
        name: 'Health & Fitness',
        tags: ['Workout', 'Nutrition', 'Mental Health', 'Yoga', 'Running', 'Weight Loss', 'Bodybuilding', 'Meditation'],
    },
    {
        name: 'Lifestyle',
        tags: ['Fashion', 'Food', 'Travel', 'Home Decor', 'Relationships', 'Parenting', 'Pets', 'Gardening', 'Minimalism'],
    },
    {
        name: 'News & Politics',
        tags: ['World News', 'Politics', 'Tech News', 'Environment', 'Local News', 'Journalism', 'Debates'],
    },
    {
        name: 'Science & Tech',
        tags: ['AI/ML', 'Robotics', 'Space', 'Physics', 'Biology', 'Climate', 'Gadgets', 'Cybersecurity', 'Web Dev', 'Data Science'],
    },
    {
        name: 'Sports',
        tags: ['Football', 'Basketball', 'Soccer', 'Tennis', 'F1', 'MMA', 'Olympics', 'Extreme Sports', 'Fantasy Sports'],
    },
    {
        name: 'AI Tools',
        tags: ['ChatGPT', 'Claude', 'Gemini', 'Midjourney', 'DALL-E', 'Stable Diffusion', 'Copilot', 'LLMs', 'Prompting', 'AI Agents'],
    },
    {
        name: 'Adult',
        tags: ['Gambling', 'Poker', 'Betting', 'Casino', 'Guns', 'Firearms', 'Weapons', 'Alcohol', 'Tobacco', 'Vaping'],
        requiresAge18: true,
    },
    {
        name: 'Adult Content',
        tags: ['Adult Content', 'NSFW', 'Mature'],
        requiresAge18: true,
    },
];

// Flatten all tags for easy lookup
export const ALL_CHANNEL_TAGS = CHANNEL_CATEGORIES.flatMap(cat => cat.tags);

// Check if tag requires 18+
export const isAdultTag = (tag: string): boolean => {
    return CHANNEL_CATEGORIES.some(
        cat => cat.requiresAge18 && cat.tags.includes(tag)
    );
};

// AI Tools for posts
export const AI_TOOLS = [
    'ChatGPT',
    'Claude',
    'Gemini',
    'Copilot',
    'Midjourney',
    'DALL-E',
    'Stable Diffusion',
    'Perplexity',
    'Grok',
    'Llama',
    'Mistral',
    'Other',
] as const;

// Post types
export const POST_TYPES = ['PROMPT', 'REQUEST'] as const;

// Referral sources for registration
export const REFERRAL_SOURCES = [
    'Search Engine',
    'Social Media',
    'Friend/Colleague',
    'Reddit',
    'Twitter/X',
    'YouTube',
    'Blog/Article',
    'Other',
] as const;

// Gender options
export const GENDER_OPTIONS = [
    { value: 'male', label: 'Male' },
    { value: 'female', label: 'Female' },
    { value: 'non-binary', label: 'Non-binary' },
    { value: 'prefer-not-to-say', label: 'Prefer not to say' },
] as const;

// Calculate age from birthdate
export const calculateAge = (birthdate: string): number => {
    const today = new Date();
    const birth = new Date(birthdate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};
