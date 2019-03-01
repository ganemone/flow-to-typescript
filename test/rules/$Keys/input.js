/* @flow */
type A<B> = B;
type C<T> = T | $Keys<A>
