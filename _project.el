;; Project values

(load-this-project
 `(
   (:search-extensions (".js" ".html" ".css" ".scss"))
   (:run-project-command (javascript-run-file (project-file :main-javascript-file)))
   (:main-javascript-file "test-bracketup.js")
   (:sass-watch-src-output-argument ,(concat (project-base-directory)))
    ) )
