;; Upstream original repo uses TABs in indentation exclusively, so adhere to that for now.
;; But note the objections to using TABs at all and especially mixing TABs and SPACEs: https://www.codecademy.com/en/forum_questions/53de86ae8c1ccc096f0030fa
((js-mode . ((indent-tabs-mode . t)
	     (js-indent-level . 8)
	     (tab-width . 8))))
