/*Add active class nav item current page */
$('nav li a').each(function(index, el) {
    if ($(this).attr('href') === window.location.pathname) {
        $(this).parent().addClass('active');
    }
});

/*Style google search input*/
window.onload = function() {
    $(".gsc-input-box").addClass('form-control');
};

/*Modal script*/
var modal = document.getElementById('myModal');
var modalImg = document.getElementById("img01");
var captionText = document.getElementById("caption");

$('.img').click(function(event) {
    modal.style.display = "block";
    modalImg.src = this.src;
    captionText.innerHTML = this.alt;
});

var span = document.getElementsByClassName("close")[0];

span.onclick = function() { 
  modal.style.display = "none";
};