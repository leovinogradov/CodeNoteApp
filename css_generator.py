template = """
  .ql-editor .ql-indent-AAA:not(.ql-direction-rtl) {
    padding-left: BBBem;
  }
  .ql-editor li.ql-indent-AAA:not(.ql-direction-rtl) {
    padding-left: CCCem;
  }
  .ql-editor .ql-indent-AAA.ql-direction-rtl.ql-align-right {
    padding-right: BBBem;
  }
  .ql-editor li.ql-indent-AAA.ql-direction-rtl.ql-align-right {
    padding-right: CCCem;
  }"""
for i in range(1, 10):
    s = template.replace("AAA", str(i))
    em1 = (i * 2)
    em2 = em1 + 1.5
    s = s.replace("BBB", str(em1))
    s = s.replace("CCC", str(em2))
    print(s)