document.addEventListener('DOMContentLoaded', () => {
    const deleteLinks = document.querySelectorAll('a.delete');

    deleteLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent default navigation
            const endpoint = link.href;

            fetch(endpoint, {
                method: 'DELETE',
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.redirect) {
                        window.location.href = data.redirect; // Perform the redirection
                    }
                })
                .catch(err => {
                    console.error('Error handling delete:', err);
                });
        });
    });
});