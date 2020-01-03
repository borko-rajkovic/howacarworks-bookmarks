document
  .querySelectorAll('body > div.customCheckBox > label.cbx')
  .forEach(checkbox => {
    checkbox.addEventListener('click', () => {
      checkbox.parentElement.querySelector('input').click();
    });
  });

document
  .querySelectorAll('body > div.customCheckBox > input')
  .forEach(input => {
    input.addEventListener('change', () => {
      if (input.checked) {
        input.parentElement.querySelector('label').classList.add('cbx-checked');
        input.parentElement
          .querySelector('label > div')
          .classList.add('cbx-flip-checked');
      } else {
        input.parentElement
          .querySelector('label')
          .classList.remove('cbx-checked');
        input.parentElement
          .querySelector('label > div')
          .classList.remove('cbx-flip-checked');
      }
    });
  });
