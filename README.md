# RTB House Tech Blog

RTB House tech blog jekyll sources.

Live version: https://techblog.rtbhouse.com/

## Editing

Set up the environment:

    sudo apt install ruby-dev ruby-bundler && bundle install

Preview changes:
  
    bundle exec jekyll serve 
  
Publish:

    bundle exec jekyll build && cp _site/feed.xml .  # work-around (see below)
    git commit
    git push

The first step is needed to locally build feed.xml. GitHub Pages doesn't support custom plugins and the default plugin limits number of posts in the feed to 10. We need all of them here to feed our (internal) parsers.

