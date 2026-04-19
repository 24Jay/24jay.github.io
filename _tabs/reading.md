---
icon: fas fa-book
title: Reading
order: 5
---

## 读书笔记

以下是我在微信读书上记录的读书笔记。

---

<ul class="post-list">
  {% assign weread_posts = site.weread | sort: 'date' | reverse %}
  {% for post in weread_posts %}
    <li>
      <span class="post-meta">{{ post.date | date: "%Y-%m-%d" }}</span>
      <a class="post-link" href="{{ post.url | relative_url }}">{{ post.title }}</a>
      {% if post.author %}<span class="post-author">— {{ post.author }}</span>{% endif %}
    </li>
  {% endfor %}
</ul>
