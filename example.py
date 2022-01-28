#!/usr/bin/env python3

s = '{19}'
print('s is:', s)

n = s[2:-1]
print(n)

# make n=20 copies of '1':
# idea: use a loop
def make_N_copies_of_1(s):
    n = s[2:-1] # number of copies
    i = 0
    result = ''
    while i < int(n):
        result += '1'
        i += 1

    return result

print(make_20_copies_of_1(s))
