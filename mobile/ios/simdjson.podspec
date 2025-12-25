Pod::Spec.new do |s|
  s.name         = "simdjson"
  s.version      = "3.9.4"
  s.summary      = "simdjson library"
  s.description  = "simdjson library for JSON parsing"
  s.homepage     = "https://github.com/simdjson/simdjson"
  s.license      = "Apache-2.0"
  s.author       = { "author" => "simdjson" }
  s.platforms    = { :ios => "11.0", :tvos => "11.0" }
  s.source = { :git => "https://github.com/simdjson/simdjson.git", :tag => "v#{s.version}" }
  s.source_files = "singleheader/*.{h,cpp}"
  s.public_header_files = 'singleheader/simdjson.h'
  s.requires_arc = true
  s.compiler_flags = '-Os'
end
