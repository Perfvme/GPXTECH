// Global function for snap details toggle
function toggleSnapDetails() {
    const snapDetails = document.getElementById('snapDetails');
    const snapHeader = document.querySelector('.snap-header');
    const snapChevron = document.getElementById('snapChevron');
    
    if (snapDetails.classList.contains('expanded')) {
        snapDetails.classList.remove('expanded');
        snapHeader.classList.remove('expanded');
    } else {
        snapDetails.classList.add('expanded');
        snapHeader.classList.add('expanded');
    }
}