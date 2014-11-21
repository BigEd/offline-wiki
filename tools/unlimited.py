import urllib
#11.255s, 0.108s sys, 11.721s user
#9.662s, 10.277s, 0.104s

count = 0
action = 0
title = ''
page = ''
def start_element(name, attrs):
  global action, title, page
  if name == 'title':
    action = 1
    title = ''
  elif title != '' and name == 'text':
    action = 2
    page = ''
    
def end_element(name):
  global action, title, page, count
  if name == 'title':
    count += 1
    if count % 100 == 0:
      print >> sys.stderr, count
    #print title.strip()
  action = 0
  title = title.strip()
  if title != '' and name == 'page':
    print '=', title, '=\n\n\n'
    print page.strip()
    
def char_data(data):
  global title, page, action
  if action == 1:
    title += data.encode('utf-8')
  elif action == 2:
    page += data.encode('utf-8')
    
import xml.parsers.expat

p = xml.parsers.expat.ParserCreate()

p.buffer_size = 1024 * 1024
p.buffer_text = True

p.StartElementHandler = start_element
p.EndElementHandler = end_element
p.CharacterDataHandler = char_data

import sys
p.ParseFile(sys.stdin)
