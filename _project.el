;; Project values

(load-this-project
 `(
   (:search-extensions (".js" ".html" ".css" ".scss" ".coffee"))
   (:run-project-command (javascript-run-file (project-file :main-javascript-file)))
   ;;(:main-javascript-file "test-correspondence-bracketup.js")
   (:main-javascript-file "compile-and-run.js")
   (:sass-watch-src-output-argument ,(concat (project-base-directory)))
    ) )
