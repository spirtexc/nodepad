# Markdown Syntax Demo

Move your cursor onto any line to see the raw Markdown.
Move it away to see the formatted result.

---

## Basic Syntax

# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

---

**This text is bold** and this is not.

*This text is italic* and this is not.

**Bold and *italic nested* together** work fine.

> This is a blockquote.
> It can span multiple lines.
> Each line starts with `> `.

This is `inline code` inside a sentence.

Visit [Markdown Guide](https://www.markdownguide.org) for the full reference.

![Nodepad Logo](https://www.markdownguide.org/assets/images/markdown-guide-og.jpg)

---

## Lists

Unordered list:

- First item
- Second item
- Third item

Ordered list:

1. First item
2. Second item
3. Third item

---

## Extended Syntax

~~This text is crossed out.~~

==This text is highlighted.==

H~2~O is water. CO~2~ is carbon dioxide.

E = mc^2^ is Einstein's famous equation.

---

## Task Lists

- [x] Buy groceries
- [x] Walk the dog
- [ ] Write documentation
- [ ] Fix that bug
- [ ] Ship the feature

---

## Fenced Code Block

```typescript
function greet(name: string): string {
  return `Hello, ${name}!`
}

console.log(greet('world'))
```

```python
def fibonacci(n: int) -> list[int]:
    a, b = 0, 1
    result = []
    for _ in range(n):
        result.append(a)
        a, b = b, a + b
    return result
```

---

## Combined Formatting

You can combine **bold**, *italic*, ~~strikethrough~~, ==highlight==, and `code` in one line.

A sentence with **bold *and italic* together** and ==highlighted ==text==.

Task with formatting: - [x] **Read** the ~~old~~ new documentation

---

## Links and Images

[Visit GitHub](https://github.com) — link with hidden markers.

[Anthropic](https://anthropic.com) builds **safe** AI systems.

Image from the web (renders inline):

![Markdown logo](https://upload.wikimedia.org/wikipedia/commons/thumb/4/48/Markdown-mark.svg/208px-Markdown-mark.svg.png)

Local image path (shows placeholder):

![Local file](./screenshot.png)

---

*End of demo. Try editing any line to see the raw Markdown syntax.*
