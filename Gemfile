source 'https://rubygems.org'

require 'json'
require 'net/http'
versions =
  begin
    JSON.parse(Net::HTTP.get(URI('https://pages.github.com/versions.json')))
  rescue SocketError
    { 'github-pages' => 228 } # This needs manual update once in a while.
  end

gem 'github-pages', versions['github-pages']
