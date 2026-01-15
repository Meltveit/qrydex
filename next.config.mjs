/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: ['lh3.googleusercontent.com'], // For Google Auth avatars
    },
    // Ensure we don't redirect strict locale logic if we want /usa
};

export default nextConfig;
