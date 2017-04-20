function modal(image, modal) {
  var img = document.getElementById(image);
  var modal = document.getElementById(modal);
  var modalImg = modal.getElementsByClassName('modal-content')[0];
  img.onclick = function(){
      modal.style.display = "block";
      modalImg.src = this.src;
  }
  var span = modal.getElementsByClassName("close")[0];
  span.onclick = function() {
    modal.style.display = "none";
  }
}
