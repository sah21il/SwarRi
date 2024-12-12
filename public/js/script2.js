document.addEventListener('DOMContentLoaded', () => {
    const deleteLinks = document.querySelectorAll('a.delete');

    deleteLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const endpoint = `/paintings/${link.dataset.doc}`;

            fetch(endpoint, {
                method: 'DELETE'
            })
                .then(response => response.json())
                .then(data => {
                    if (data.redirect) {
                        window.location.href = data.redirect; // Redirect to the paintings page
                    }
                })
                .catch(err => console.error('Error:', err));
        });
    });
});