* [x] Écrire un script (pre-commit ~~/ lint-staged~~ ?) qui met à jour les versions
  + quand un package est modifié, son numéro de version augmente
  	- Le script travaille uniquement sur l'index
  + quand un package dépend d'un autre, la version enregistrée dans les '(dev|peer|)dependencies' doit correspondre à la version actuelle du package visé.
