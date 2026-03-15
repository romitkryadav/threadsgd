document.addEventListener('DOMContentLoaded', () => {
    const downloadBtn = document.getElementById('downloadBtn');
    const threadsUrlInput = document.getElementById('threadsUrl');
    const statusMessage = document.getElementById('statusMessage');
    const resultSection = document.getElementById('resultSection');
    const previewContainer = document.getElementById('previewContainer');
    const finalDownloadBtn = document.getElementById('finalDownloadBtn');

    const showStatus = (msg, isError = false) => {
        statusMessage.textContent = msg;
        statusMessage.className = `mt-4 text-sm ${isError ? 'text-red-500' : 'text-indigo-600'}`;
        statusMessage.classList.remove('hidden');
    };

    const hideStatus = () => {
        statusMessage.classList.add('hidden');
    };

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
            const response = await fetch(`https://dp.romitkr361.workers.dev/?url=${encodeURIComponent(url)}`);
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
                previewContainer.className = 'flex flex-col items-center p-4';
                
                const downloadItem = async (item) => {
                    const mediaUrl = item.url;
                    try {
                        const proxyUrl = `https://images.weserv.nl/?url=${encodeURIComponent(mediaUrl)}&output=bin`;
                        const blobResponse = await fetch(proxyUrl);
                        if (!blobResponse.ok) throw new Error('Proxy failed');
                        const blob = await blobResponse.blob();
                        
                        const blobUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = blobUrl;
                        a.download = `threads-dp-${Date.now()}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(blobUrl);
                    } catch (err) {
                        window.open(mediaUrl, '_blank');
                    }
                };
                
                const item = mediaItems[0];
                const itemWrapper = document.createElement('div');
                itemWrapper.className = 'bg-black/90 p-6 rounded-3xl border border-white/20 shadow-2xl shadow-white/10 flex flex-col items-center max-w-sm w-full';
                
                const label = document.createElement('span');
                label.className = 'text-xs font-bold uppercase tracking-wider text-white mb-4 bg-white/10 px-3 py-1 rounded-full';
                label.textContent = 'High Quality Profile Picture';
                itemWrapper.appendChild(label);

                const img = document.createElement('img');
                // Use proxy for high res and bypass CORS
                img.src = `https://images.weserv.nl/?url=${encodeURIComponent(item.url)}&w=600&h=600&fit=cover`;
                img.className = 'rounded-full shadow-2xl w-64 h-64 object-cover mb-6 border-4 border-white';
                img.referrerPolicy = 'no-referrer';
                img.onerror = () => {
                    img.src = item.url;
                };
                itemWrapper.appendChild(img);

                const downloadBtnItem = document.createElement('button');
                downloadBtnItem.className = 'w-full bg-black text-white px-8 py-4 rounded-2xl font-bold hover:bg-white/10 transition-all shadow-lg border border-white/20 flex items-center justify-center gap-2';
                downloadBtnItem.innerHTML = '<span>Download HD Profile Picture</span>';
                
                downloadBtnItem.onclick = async (e) => {
                    e.preventDefault();
                    const originalContent = downloadBtnItem.innerHTML;
                    downloadBtnItem.textContent = 'Downloading...';
                    downloadBtnItem.disabled = true;

                    await downloadItem(item);
                    
                    downloadBtnItem.innerHTML = originalContent;
                    downloadBtnItem.disabled = false;
                };

                itemWrapper.appendChild(downloadBtnItem);
                previewContainer.appendChild(itemWrapper);

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

    // Allow Enter key to trigger download
    threadsUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            downloadBtn.click();
        }
    });

    const allMenuLinks = document.querySelectorAll('.menu-link, .desktop-menu-link');

    let currentPath = window.location.pathname;
    if (currentPath.endsWith('/index.html')) {
        currentPath = currentPath.replace('/index.html', '/');
    }
    if (currentPath !== '/' && currentPath.endsWith('/')) {
        currentPath = currentPath.slice(0, -1);
    }

    allMenuLinks.forEach(link => {
        let href = link.getAttribute('href');
        if (href.endsWith('/index.html')) href = href.replace('/index.html', '/');
        if (href !== '/' && href.endsWith('/')) href = href.slice(0, -1);

        if (href === currentPath || (currentPath === '/' && href === './index.html') || (currentPath === '/' && href === '/')) {
            link.classList.add('active');
        }
    });
});
