function inizializzaSlider() {
    let track = document.getElementById("slider-track");
    let slides = document.getElementsByClassName("slide");
    let index = 0;
    let margin = 0;

    function move() {
        const slideWidth = slides[0].offsetWidth + margin;
        index = (index + 1) % (slides.length);//per non uscire dall'array
        const offset = -(index * slideWidth);
        track.style.transform = `translateX(${offset}px)`;
    };

    if (slides.length > 0) {
        const slider = document.getElementById("slider");
        slider.addEventListener("click", move);
        const infoText = document.createElement("p");
        infoText.textContent = "(Clicca per scorrere le immagini)";
        slider.appendChild(infoText);
    }
};

window.inizializzaSlider = inizializzaSlider;