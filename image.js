document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    const threadsUrlInput = document.getElementById('threadsUrl');
    const statusMessage = document.getElementById('statusMessage');
    const resultSection = document.getElementById('resultSection');
    const previewContainer = document.getElementById('previewContainer');
    const finalDownloadBtn = document.getElementById('finalDownloadBtn');

    const hasDownloaderUI = downloadBtn && threadsUrlInput && statusMessage && resultSection && previewContainer && finalDownloadBtn;

    const showStatus = (msg, isError = false) => {
        if (!statusMessage) return;
        statusMessage.textContent = msg;
        statusMessage.className = `mt-4 text-sm ${isError ? 'text-red-500' : 'text-white'}`;
        statusMessage.classList.remove('hidden');
    };

    const hideStatus = () => {
        if (!statusMessage) return;
        statusMessage.classList.add('hidden');
    };

    if (hasDownloaderUI) {
        downloadBtn.addEventListener('click', async () => {
            const url = threadsUrlInput.value.trim();

        if (!url) {
            showStatus('Please enter a Threads URL', true);
            return;
        }

        if (!url.includes('threads.net') && !url.includes('threads.com')) {
            showStatus('Invalid Threads URL. Please check again.', true);
            return;
        }

        // Reset UI
        hideStatus();
        resultSection.classList.add('hidden');
        downloadBtn.disabled = true;
        downloadBtn.textContent = 'Processing...';
        downloadBtn.classList.add('loading');

        try {
            // Using the user's worker URL
            const response = await fetch(`https://ai.romitkr361.workers.dev/?url=${encodeURIComponent(url)}`);
            const data = await response.json();

            if (data.success) {
                // Normalize data to always use a media array
                let mediaItems = [];
                if (data.media && Array.isArray(data.media)) {
                    mediaItems = data.media;
                } else if (data.url && data.type) {
                    mediaItems = [{ url: data.url, type: data.type }];
                }

                if (mediaItems.length === 0) {
                    showStatus('No media found on this page.', true);
                    return;
                }

                // Show result
                previewContainer.innerHTML = '';
                previewContainer.className = 'grid grid-cols-1 gap-6 p-4';
                
                if (mediaItems.length > 1) {
                    const downloadAllBtn = document.createElement('button');
                    downloadAllBtn.className = 'w-full bg-black text-white px-8 py-4 rounded-xl font-bold hover:bg-[#111] transition-all shadow-lg mb-4';
                    downloadAllBtn.style.boxShadow = '0 8px 25px rgba(255,255,255,0.25), 0 0 45px rgba(255,255,255,0.12)';
                    downloadAllBtn.textContent = `Download All (${mediaItems.length} items)`;
                    downloadAllBtn.onclick = async () => {
                        const originalText = downloadAllBtn.textContent;
                        downloadAllBtn.textContent = 'Downloading all...';
                        downloadAllBtn.disabled = true;
                        
                        for (let i = 0; i < mediaItems.length; i++) {
                            const item = mediaItems[i];
                            await downloadItem(item, i + 1);
                            // Add a small delay between downloads to avoid browser blocking
                            await new Promise(resolve => setTimeout(resolve, 500));
                        }
                        
                        downloadAllBtn.textContent = originalText;
                        downloadAllBtn.disabled = false;
                    };
                    previewContainer.appendChild(downloadAllBtn);
                }

                const downloadItem = async (item, index) => {
                    const mediaUrl = item.url;
                    const isVideo = item.type === 'video';

                    try {
                        let blob;
                        if (!isVideo) {
                            const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(mediaUrl)}&output=bin`;
                            const blobResponse = await fetch(proxyUrl);
                            if (!blobResponse.ok) throw new Error('Proxy failed');
                            blob = await blobResponse.blob();
                        } else {
                            try {
                                const blobResponse = await fetch(mediaUrl);
                                if (!blobResponse.ok) throw new Error('Direct fetch failed');
                                blob = await blobResponse.blob();
                            } catch (err) {
                                throw new Error('CORS blocked');
                            }
                        }
                        
                        const blobUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `threads-${item.type}-${Date.now()}-${index}.${isVideo ? 'mp4' : 'jpg'}`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(blobUrl);
                    } catch (err) {
                        window.open(mediaUrl, '_blank');
                    }
                };
                
                mediaItems.forEach((item, index) => {
                    const itemWrapper = document.createElement('div');
                    itemWrapper.className = 'bg-black/90 p-4 rounded-xl border border-white/20 flex flex-col items-center text-white shadow-2xl';
                    
                    if (item.type === 'video') {
                        const video = document.createElement('video');
                        video.controls = true;
                        video.className = 'rounded-lg shadow-sm w-full max-h-[400px] bg-black mb-4';
                        video.playsInline = true;
                        video.poster = `https://images.weserv.nl/?url=${encodeURIComponent(item.url)}&w=400&h=400&fit=cover`; // Try to use the video URL as a poster (weserv might extract a frame if it's an image, or we can use it if it's a thumbnail)
                        
                        const source = document.createElement('source');
                        source.src = item.url;
                        source.type = 'video/mp4';
                        video.appendChild(source);

                        video.onerror = () => {
                            console.error('Video failed to load');
                            const errorMsg = document.createElement('p');
                            errorMsg.className = 'text-xs text-red-400 mb-2';
                            errorMsg.textContent = 'Video preview blocked by browser. You can still download it below.';
                            itemWrapper.insertBefore(errorMsg, video);
                        };
                        
                        itemWrapper.appendChild(video);
                    } else {
                        const img = document.createElement('img');
                        // Use proxy by default for better reliability with Instagram/Threads CDNs
                        img.src = `https://images.weserv.nl/?url=${encodeURIComponent(item.url)}`;
                        img.className = 'rounded-lg shadow-sm w-full max-h-[400px] object-contain mb-4';
                        img.referrerPolicy = 'no-referrer';
                        img.onerror = () => {
                            // Fallback to direct URL if proxy fails
                            img.src = item.url;
                        };
                        itemWrapper.appendChild(img);
                    }

                    const downloadBtn = document.createElement('button');
                    downloadBtn.className = 'w-full bg-black text-white px-6 py-3 rounded-lg font-bold hover:bg-[#111] transition-all';
                    downloadBtn.style.boxShadow = '0 8px 25px rgba(255,255,255,0.25), 0 0 45px rgba(255,255,255,0.12)';
                    downloadBtn.textContent = `Download ${item.type === 'video' ? 'Video' : 'Image'} ${mediaItems.length > 1 ? index + 1 : ''}`;
                    
                    downloadBtn.onclick = async (e) => {
                        e.preventDefault();
                        const originalText = downloadBtn.textContent;
                        downloadBtn.textContent = 'Downloading...';
                        downloadBtn.disabled = true;

                        await downloadItem(item, index + 1);
                        
                        downloadBtn.textContent = originalText;
                        downloadBtn.disabled = false;
                    };

                    itemWrapper.appendChild(downloadBtn);
                    previewContainer.appendChild(itemWrapper);
                });

                // Hide the single download button since we have per-item buttons
                finalDownloadBtn.classList.add('hidden');
                
                resultSection.classList.remove('hidden');
                resultSection.scrollIntoView({ behavior: 'smooth' });
            } else {
                showStatus(data.error || 'Failed to extract media. Make sure the post is public.', true);
            }
        } catch (error) {
            console.error('Download error:', error);
            showStatus('An error occurred while processing your request.', true);
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = 'Download';
            downloadBtn.classList.remove('loading');
        }
    });
    }

    // Allow Enter key to trigger download
    if (hasDownloaderUI) {
        threadsUrlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                downloadBtn.click();
            }
        });
    }

    const allMenuLinks = document.querySelectorAll('.menu-link, .desktop-menu-link');

    let currentPath = window.location.pathname;

    // Normalize default index URL and trailing slash behavior
    if (currentPath.endsWith('/index.html')) {
        currentPath = currentPath.replace('/index.html', '/');
    }
    if (currentPath !== '/' && currentPath.endsWith('/')) {
        currentPath = currentPath.slice(0, -1);
    }

    allMenuLinks.forEach(link => {
        let href = link.getAttribute('href');
        if (href.endsWith('/index.html')) {
            href = href.replace('/index.html', '/');
        }
        if (href !== '/' && href.endsWith('/')) {
            href = href.slice(0, -1);
        }

        if (href === currentPath || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });
});
